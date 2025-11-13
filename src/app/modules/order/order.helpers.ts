import { PrismaClient, UserRole } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const prisma = new PrismaClient();

/**
 * Normalize date to start of day (00:00:00)
 */
export const normalizeDateToStartOfDay = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

/**
 * Get or create MainOrder for today for a user (DAILY ORDER UPSERT)
 * This enforces the "one order per user per day" rule
 */
export const getOrCreateDailyMainOrder = async (
  userId: string,
  tx: any = prisma
) => {
  const today = normalizeDateToStartOfDay(new Date());

  // Try to find existing MainOrder for today using unique constraint
  let mainOrder = await tx.mainOrder.findUnique({
    where: {
      userId_orderDate: {
        userId,
        orderDate: today,
      },
    },
  });

  // Create new MainOrder if doesn't exist
  if (!mainOrder) {
    mainOrder = await tx.mainOrder.create({
      data: {
        userId,
        totalAmount: 0,
        pendingAmount: 0,
        totalReturnedAmount: 0,
        totalWalletUsed: 0,
        totalDuesAmount: 0,
        isDuesCleared: true,
        orderDate: today,
        status: "Pending",
      },
    });
  }

  return mainOrder;
};

/**
 * Recalculate MainOrder totals from all its orders and products
 * Called whenever order is updated, product rejected/returned
 * TEMPORARY VERSION - full version with product status filtering will be enabled after prisma generate
 */
export const recalculateDailyOrderTotals = async (
  mainOrderId: string,
  tx: any = prisma
) => {
  // Get all orders with products in this MainOrder
  const orders = await tx.order.findMany({
    where: { mainOrderId },
    include: {
      products: true,
    },
  });

  if (orders.length === 0) {
    return;
  }

  // Calculate totals (simplified for now, will enhance after schema update)
  let totalAmount = 0;
  let totalReturnedAmount = 0;
  let totalWalletUsed = 0;
  let pendingAmount = 0;
  let totalDuesAmount = 0;

  for (const order of orders) {
    let orderActiveAmount = 0;

    for (const product of order.products) {
      // For now, count all non-returned products
      // TODO: After prisma generate, filter by status field
      if (!product.isReturned) {
        orderActiveAmount += product.price;
      } else {
        totalReturnedAmount += product.price;
      }
    }

    totalAmount += orderActiveAmount;
    totalWalletUsed += order.walletAmountUsed || 0;

    // Calculate pending (COD orders that aren't cancelled/returned)
    if (
      order.paymentMethod === "COD" &&
      order.status !== "Cancelled" &&
      order.status !== "FullyReturned"
    ) {
      pendingAmount += orderActiveAmount;
    }

    // Calculate dues (Credit orders not cleared)
    if (order.isDues && !order.duesCleared) {
      totalDuesAmount += orderActiveAmount;
    }
  }

  // Check if all dues are cleared
  const isDuesCleared = !orders.some(
    (order: any) => order.isDues && !order.duesCleared
  );

  // Update MainOrder with recalculated totals
  await tx.mainOrder.update({
    where: { id: mainOrderId },
    data: {
      totalAmount,
      pendingAmount,
      totalReturnedAmount,
      totalWalletUsed,
      totalDuesAmount,
      isDuesCleared,
    },
  });
};

/**
 * Update daily product summary in REAL-TIME (no end-of-day aggregation)
 * Uses atomic operations to prevent race conditions
 */
export const updateDailyProductSummary = async (
  products: any[],
  mainOrderId: string,
  orderDate: Date,
  operation: "add" | "remove" | "reject" | "return",
  tx: any = prisma
) => {
  const today = normalizeDateToStartOfDay(orderDate);

  for (const p of products) {
    // Get product variation for weight and price
    const variation = await tx.productVariation.findUnique({
      where: { id: p.variationId },
      select: { weight: true, sellingPrice: true },
    });

    if (!variation) {
      continue; // Skip if variation not found
    }

    const weight = variation.weight || 0;
    const pricePerKg = variation.sellingPrice || 0;
    const totalWeight = p.quantity * weight;
    const totalPrice = pricePerKg * totalWeight;

    // Check if mainOrderProduct already exists for this product today
    const existing = await tx.mainOrderProduct.findUnique({
      where: {
        productId_orderDate: {
          productId: p.productId,
          orderDate: today,
        },
      },
    });

    if (operation === "add") {
      if (existing) {
        // Update existing record with atomic increments
        const updatedOrderIds = [...new Set([...existing.orderIds, mainOrderId])];
        
        await tx.mainOrderProduct.update({
          where: { id: existing.id },
          data: {
            totalOrders: existing.orderIds.includes(mainOrderId)
              ? existing.totalOrders
              : existing.totalOrders + 1,
            totalQuantity: { increment: p.quantity },
            totalWeight: { increment: totalWeight },
            totalPrice: { increment: totalPrice },
            orderIds: updatedOrderIds,
          },
        });
      } else {
        // Create new record
        await tx.mainOrderProduct.create({
          data: {
            productId: p.productId,
            totalOrders: 1,
            totalQuantity: p.quantity,
            totalWeight: totalWeight,
            totalPrice: totalPrice,
            acceptedWeight: 0,
            rejectedWeight: 0,
            returnWeight: 0,
            orderIds: [mainOrderId],
            orderDate: today,
            status: "Pending",
          },
        });
      }
    } else if (operation === "remove") {
      if (existing) {
        const newTotalQuantity = Math.max(0, existing.totalQuantity - p.quantity);
        const newTotalWeight = Math.max(0, existing.totalWeight - totalWeight);
        const newTotalPrice = Math.max(0, existing.totalPrice - totalPrice);

        // Remove mainOrderId from orderIds
        const updatedOrderIds = existing.orderIds.filter(
          (id: string) => id !== mainOrderId
        );
        const newTotalOrders = Math.max(0, existing.totalOrders - 1);

        await tx.mainOrderProduct.update({
          where: { id: existing.id },
          data: {
            totalOrders: newTotalOrders,
            totalQuantity: newTotalQuantity,
            totalWeight: newTotalWeight,
            totalPrice: newTotalPrice,
            orderIds: updatedOrderIds,
            status: updatedOrderIds.length === 0 ? "Cancelled" : existing.status,
          },
        });
      }
    } else if (operation === "reject") {
      if (existing) {
        await tx.mainOrderProduct.update({
          where: { id: existing.id },
          data: {
            totalQuantity: { decrement: p.quantity },
            totalWeight: { decrement: totalWeight },
            totalPrice: { decrement: totalPrice },
            rejectedWeight: { increment: totalWeight },
            status: "Partial", // Mark as partial since some products rejected
          },
        });
      }
    } else if (operation === "return") {
      if (existing) {
        await tx.mainOrderProduct.update({
          where: { id: existing.id },
          data: {
            totalWeight: { decrement: totalWeight },
            totalPrice: { decrement: totalPrice },
            returnWeight: { increment: totalWeight },
            status: "Partial", // Mark as partial since some products returned
          },
        });
      }
    }
  }
};

/**
 * PLACEHOLDER FUNCTIONS - Will be fully implemented after running: bunx prisma generate
 * These require the new OrderProductStatus enum and orderChangeLog model
 */

export const rejectOrderProduct = async (
  orderProductId: string,
  userId: string,
  reason?: string
) => {
  throw new ApiError(
    httpStatus.NOT_IMPLEMENTED,
    "Reject product feature will be available after running: bunx prisma generate"
  );
};

export const returnOrderProduct = async (
  orderProductId: string,
  returnQuantity: number,
  userId: string,
  reason?: string
) => {
  throw new ApiError(
    httpStatus.NOT_IMPLEMENTED,
    "Return product feature will be available after running: bunx prisma generate"
  );
};

export const cancelFullOrderByDriver = async (
  orderId: string,
  userId: string,
  reason?: string
) => {
  throw new ApiError(
    httpStatus.NOT_IMPLEMENTED,
    "Cancel order feature will be available after running: bunx prisma generate"
  );
};
