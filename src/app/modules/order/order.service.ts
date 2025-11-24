import {
  PrismaClient,
  PaymentMethod,
  OrderStatus,
  UserRole,
} from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  ICreateOrderPayload,
} from "./order.interface";
import {
  getOrCreateDailyOrder,
  mergeOrCreateOrderProduct,
  updateDailyProductAggregation,
  recalculateDailyOrderTotal,
  getDateString,
  acceptOrderProduct,
  rejectOrderProduct,
  adjustOrderProductByDriver,
  getDailyProductSummary,
  getDailyOrders,
} from "./order.helpers";

const prisma = new PrismaClient();

/**
 * Place order with COD payment
 * Merges products into daily order with snapshot pricing
 */
const placeOrderCOD = async (payload: ICreateOrderPayload) => {
  const { userId, products, shippingAddressId, branchId } = payload;

  // Validate user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Fetch all products with variations
  const productIds = products.map((p) => p.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      productVariation: true,
    },
  });

  // Validate products and prepare with snapshot pricing
  const validatedProducts: Array<{
    productId: string;
    variationId: string;
    quantity: number;
    product: any;
    variation: any;
    snapshotPricePerKg: number;
    snapshotWeightPerUnit: number;
  }> = [];
  
  for (const p of products) {
    const dbProduct = dbProducts.find((prod) => prod.id === p.productId);
    if (!dbProduct) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Product not found: ${p.productId}`
      );
    }

    const variation = dbProduct.productVariation.find(
      (v) => v.id === p.variationId
    );
    if (!variation) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Variation not found for product: ${dbProduct.name}`
      );
    }

    // Snapshot pricing - capture current price
    validatedProducts.push({
      productId: p.productId,
      variationId: p.variationId,
      quantity: p.quantity,
      product: dbProduct,
      variation: variation,
      snapshotPricePerKg: variation.sellingPrice,
      snapshotWeightPerUnit: variation.weight,
    });
  }

  // Execute in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Get or create today's DailyOrder
    const dailyOrder = await getOrCreateDailyOrder(
      userId,
      shippingAddressId,
      branchId,
      PaymentMethod.COD,
      tx
    );

    // Merge or create OrderProducts with snapshot pricing
    const orderProducts = [];
    for (const p of validatedProducts) {
      const orderProduct = await mergeOrCreateOrderProduct(
        dailyOrder.id,
        p.productId,
        p.variationId,
        p.quantity,
        p.snapshotPricePerKg,
        p.snapshotWeightPerUnit,
        tx
      );
      orderProducts.push(orderProduct);

      // Update daily product aggregation
      const weight = p.quantity * p.snapshotWeightPerUnit;
      const price = weight * p.snapshotPricePerKg;
      await updateDailyProductAggregation(
        p.productId,
        dailyOrder.id,
        weight,
        price,
        "add",
        tx
      );
    }

    // Recalculate total
    await recalculateDailyOrderTotal(dailyOrder.id, tx);

    // Fetch updated order
    const updatedOrder = await tx.dailyOrder.findUnique({
      where: { id: dailyOrder.id },
      include: {
        OrderProducts: {
          include: {
            product: true,
            OrderProductVariation: true,
          },
        },
        shippingAddress: true,
        user: true,
      },
    });

    return updatedOrder;
  });

  return result;
};

/**
 * Place order with Wallet payment
 */
const placeOrderWallet = async (payload: ICreateOrderPayload) => {
  const { userId, products, shippingAddressId, branchId } = payload;

  // Validate user and wallet
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Wallet: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.Wallet) {
    throw new ApiError(httpStatus.NOT_FOUND, "Wallet not found for user");
  }

  // Fetch products
  const productIds = products.map((p) => p.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      productVariation: true,
    },
  });

  // Validate and calculate total
  const validatedProducts: Array<{
    productId: string;
    variationId: string;
    quantity: number;
    product: any;
    variation: any;
    snapshotPricePerKg: number;
    snapshotWeightPerUnit: number;
  }> = [];
  let orderTotal = 0;

  for (const p of products) {
    const dbProduct = dbProducts.find((prod) => prod.id === p.productId);
    if (!dbProduct) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Product not found: ${p.productId}`
      );
    }

    const variation = dbProduct.productVariation.find(
      (v) => v.id === p.variationId
    );
    if (!variation) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Variation not found for product: ${dbProduct.name}`
      );
    }

    const weight = p.quantity * variation.weight;
    const price = weight * variation.sellingPrice;
    orderTotal += price;

    validatedProducts.push({
      productId: p.productId,
      variationId: p.variationId,
      quantity: p.quantity,
      product: dbProduct,
      variation: variation,
      snapshotPricePerKg: variation.sellingPrice,
      snapshotWeightPerUnit: variation.weight,
    });
  }

  // Check wallet balance
  if (user.Wallet.balance < orderTotal) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient wallet balance. Available: ₹${user.Wallet.balance}, Required: ₹${orderTotal}`
    );
  }

  // Execute in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Deduct wallet balance
    await tx.wallet.update({
      where: { id: user.Wallet!.id },
      data: {
        balance: { decrement: orderTotal },
      },
    });

    // Get or create today's DailyOrder
    const dailyOrder = await getOrCreateDailyOrder(
      userId,
      shippingAddressId,
      branchId,
      PaymentMethod.Wallet,
      tx
    );

    // Update wallet amount used
    await tx.dailyOrder.update({
      where: { id: dailyOrder.id },
      data: {
        walletAmountUsed: { increment: orderTotal },
      },
    });

    // Merge products
    for (const p of validatedProducts) {
      await mergeOrCreateOrderProduct(
        dailyOrder.id,
        p.productId,
        p.variationId,
        p.quantity,
        p.snapshotPricePerKg,
        p.snapshotWeightPerUnit,
        tx
      );

      // Update aggregation
      const weight = p.quantity * p.snapshotWeightPerUnit;
      const price = weight * p.snapshotPricePerKg;
      await updateDailyProductAggregation(
        p.productId,
        dailyOrder.id,
        weight,
        price,
        "add",
        tx
      );
    }

    // Recalculate total
    await recalculateDailyOrderTotal(dailyOrder.id, tx);

    // Record wallet transaction
    await tx.walletTransaction.create({
      data: {
        walletId: user.Wallet!.id,
        amount: orderTotal,
        type: "Debit",
        description: `Payment for daily order (${getDateString()})`,
        status: "Success",
      },
    });

    // Fetch updated order
    const updatedOrder = await tx.dailyOrder.findUnique({
      where: { id: dailyOrder.id },
      include: {
        OrderProducts: {
          include: {
            product: true,
            OrderProductVariation: true,
          },
        },
        shippingAddress: true,
        user: true,
      },
    });

    return updatedOrder;
  });

  return result;
};

/**
 * Main order creation function
 */
const createOrder = async (payload: ICreateOrderPayload) => {
  switch (payload.paymentMethod) {
    case "COD":
      return await placeOrderCOD(payload);
    case "Wallet":
      return await placeOrderWallet(payload);
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payment method");
  }
};

/**
 * Get user's daily orders
 */
const getUserDailyOrders = async (userId: string, queryParams: any) => {
  const { status, startDate, endDate } = queryParams;

  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.orderDate = {};
    if (startDate) where.orderDate.gte = startDate;
    if (endDate) where.orderDate.lte = endDate;
  }

  return await prisma.dailyOrder.findMany({
    where,
    include: {
      OrderProducts: {
        include: {
          product: true,
          OrderProductVariation: true,
        },
      },
      shippingAddress: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Get today's order for a user
 */
const getTodayOrder = async (userId: string) => {
  const dateString = getDateString();

  return await prisma.dailyOrder.findFirst({
    where: {
      userId,
      orderDate: dateString,
    },
    include: {
      OrderProducts: {
        include: {
          product: true,
          OrderProductVariation: true,
        },
      },
      shippingAddress: true,
    },
  });
};

/**
 * Get all daily orders (for admin)
 */
const getAllDailyOrders = async (queryParams: any) => {
  const { dateString, branchId, status } = queryParams;
  
  const where: any = {};
  
  if (dateString) {
    where.orderDate = dateString;
  }
  
  if (branchId) {
    where.branchId = branchId;
  }
  
  if (status) {
    where.status = status;
  }

  return await prisma.dailyOrder.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      OrderProducts: {
        include: {
          product: true,
          OrderProductVariation: true,
        },
      },
      shippingAddress: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Get daily product summary
 */
const getDailySummary = async (dateString?: string) => {
  return await getDailyProductSummary(dateString);
};

/**
 * Accept order product (Admin)
 */
const acceptProduct = async (orderProductId: string, userId: string) => {
  return await acceptOrderProduct(orderProductId, userId);
};

/**
 * Reject order product (Admin)
 */
const rejectProduct = async (
  orderProductId: string,
  userId: string,
  reason?: string
) => {
  return await rejectOrderProduct(orderProductId, userId, reason);
};

/**
 * Adjust product quantity (Driver)
 */
const adjustProductQuantity = async (
  orderProductId: string,
  newWeight: number,
  userId: string,
  reason?: string
) => {
  return await adjustOrderProductByDriver(
    orderProductId,
    newWeight,
    userId,
    reason
  );
};

/**
 * Get order by ID
 */
const getOrderById = async (id: string) => {
  const order = await prisma.dailyOrder.findUnique({
    where: { id },
    include: {
      OrderProducts: {
        include: {
          product: true,
          OrderProductVariation: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
      shippingAddress: true,
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

export const orderServices = {
  createOrder,
  placeOrderCOD,
  placeOrderWallet,
  getUserDailyOrders,
  getTodayOrder,
  getAllDailyOrders,
  getDailySummary,
  acceptProduct,
  rejectProduct,
  adjustProductQuantity,
  getOrderById,
};
