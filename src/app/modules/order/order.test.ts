//@ts-nocheck

// import httpStatus from "http-status";
// import ApiError from "../../../errors/ApiErrors";
// import prisma from "../../../shared/prisma";

import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { PaymentMethod } from "@prisma/client";
import { recalculateDailyOrderTotal, updateDailyProductAggregation } from "./order.helpers";

// export const acceptOrderProduct = async (totalOrderProductId: string) => {
//   return await prisma.$transaction(async (tx) => {
//     // Fetch the total product order
//     const totalOrderProduct = await tx.totalProductOrder.findUnique({
//       where: { id: totalOrderProductId },
//     });

//     if (!totalOrderProduct) {
//       throw new ApiError(httpStatus.NOT_FOUND, "Order product not found");
//     }

//     // Update totalProductOrder status to Confirmed
//     await tx.totalProductOrder.update({
//       where: { id: totalOrderProductId },
//       data: {
//         status: "Confirmed",
//         acceptedWeight: totalOrderProduct.totalWeight,
//       },
//     });

//     const productId = totalOrderProduct.productId;

//     // Fetch all daily orders related to this totalProductOrder
//     const dailyOrders = await tx.dailyOrder.findMany({
//       where: { id: { in: totalOrderProduct.orderIds } },
//     });

//     for (const order of dailyOrders) {
//       // Fetch only the specific product of this order
//       const orderProducts = await tx.orderProduct.findMany({
//         where: { orderId: order.id, productId },
//       });

//       if (orderProducts.length === 0) continue; // Skip if no product found

//       // Calculate total weight and price for this product in the order
//       const orderTotalWeight = orderProducts.reduce(
//         (sum, prod) => sum + prod.totalWeight!,
//         0
//       );

//       const orderTotalPrice = orderProducts.reduce(
//         (sum, prod) => sum + prod.totalPrice!,
//         0
//       );

//       // Update only the specific product(s) as Confirmed
//       await tx.orderProduct.updateMany({
//         where: { orderId: order.id, productId },
//         data: {
//           status: "Confirmed",
//           acceptedWeight: orderTotalWeight,
//           acceptedPrice: orderTotalPrice,
//         },
//       });

//       // Check if all products of the order are now confirmed
//       const pendingCount = await tx.orderProduct.count({
//         where: { orderId: order.id, status: "Pending" },
//       });

//       const allConfirmed = pendingCount === 0;

//       // Update daily order with increment and status if all confirmed
//       await tx.dailyOrder.update({
//         where: { id: order.id },
//         data: {
//           totalAcceptedWeight: { increment: orderTotalWeight },
//           totalAcceptedPrice: { increment: orderTotalPrice },
//           status: allConfirmed ? "Active" : undefined,
//         },
//       });
//     }

//     return
//   });
// };


export const rejectOrderPartialProductOrFull = async (totalorderProductId: string) => {
  /*  //! What i need to do after admin reject a product
    1. Mark order product as cancelled
    2. Refund wallet if payment was wallet
    3. Update daily product aggregation (rejected weight/price) in product also user daily orders
    4. Recalculate daily order total. 
  */

  return await prisma.$transaction(async (tx) => {
    const totalOrderProduct = await tx.totalProductOrder.findUnique({
      where: { id: totalorderProductId },
    });

    if (!totalOrderProduct) {
      throw new ApiError(httpStatus.NOT_FOUND, "Order product not found");
    }

    // update the totalOrderProduct status to cancelled
    await tx.totalProductOrder.update({
      where: { id: totalorderProductId },
      data: {
        status: "Cancelled",
        rejectedWeight: { decrement: Number(totalOrderProduct.totalWeight) },
      },
    });

    const productId = totalOrderProduct.productId;
    
    const orderProduct = await tx.orderProduct.findUnique({
      where: { id: orderProductId },
      include: {
        order: {
          include: {
            user: {
              include: { Wallet: true },
            },
          },
        },
      },
    });

    if (!orderProduct || !orderProduct.order) {
      throw new ApiError(httpStatus.NOT_FOUND, "Order product not found");
    }

    if (orderProduct.status === "Cancelled") {
      throw new ApiError(httpStatus.BAD_REQUEST, "Product already cancelled");
    }


    const rejectedAmount = orderProduct.totalPrice;
    const rejectedWeight = orderProduct.totalWeight;

    // Mark as cancelled
    await tx.orderProduct.update({
      where: { id: orderProductId },
      data: {
        status: "Cancelled",
        rejectedWeight: orderProduct.totalWeight,
      },
    });

    // Refund wallet if payment was Wallet
    if (
      orderProduct.order.paymentMethod === PaymentMethod.Wallet &&
      orderProduct.order.user?.Wallet
    ) {
      await tx.wallet.update({
        where: { id: orderProduct.order.user.Wallet.id },
        data: {
          balance: { increment: Number(rejectedAmount) },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: orderProduct.order.user.Wallet.id,
          amount: Number(rejectedAmount),
          type: "Credit",
          description: `Refund for rejected product (Admin rejected)`,
          status: "Success",
        },
      });
    }

    // Update daily aggregation
    await updateDailyProductAggregation(
      orderProduct.productId!,
      orderProduct.order.id,
      Number(rejectedWeight),
      Number(rejectedAmount),
      "cancel",
      tx
    );

    // Recalculate order total
    await recalculateDailyOrderTotal(orderProduct.order.id, tx);

    return {
      message: "Product rejected successfully",
      refundAmount: rejectedAmount,
      refunded: orderProduct.order.paymentMethod === PaymentMethod.Wallet,
    };
  });
};


// calcelled the full Order 


// return partail amount of Kgs Product