import { PrismaClient, UserRole, PaymentMethod, product } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const prisma = new PrismaClient();

/**
 * Get date string in YYYY-MM-DD format for daily aggregation
 */
export const getDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get or create DailyOrder for a user on a specific date
 * Enforces ONE order per user per day until midnight
 */
export const getOrCreateDailyOrder = async (
  userId: string,
  shippingAddressId: string,
  branchId: string,
  paymentMethod: PaymentMethod,
  tx: any = prisma
) => {
  const dateString = getDateString();

  // Try to find existing DailyOrder for today
  let dailyOrder = await tx.dailyOrder.findFirst({
    where: {
      userId,
      orderDate: dateString,
    },
    include: {
      OrderProducts: {
        include: {
          OrderProductVariation: true,
        },
      },
    },
  });

  // Create new DailyOrder if doesn't exist
  if (!dailyOrder) {
    dailyOrder = await tx.dailyOrder.create({
      data: {
        userId,
        orderDate: dateString,
        shippingAddressId,
        branchId,
        paymentMethod,
        totalAmount: 0,
        walletAmountUsed: 0,
        RemainingAmount: 0,
        status: "Pending",
      },
      include: {
        OrderProducts: {
          include: {
            OrderProductVariation: true,
          },
        },
      },
    });
  }

  return dailyOrder;
};

/**
 * Merge or create OrderProduct with snapshot pricing
 * If product exists in today's order, merge quantities
 * Uses SNAPSHOT pricing at time of order (won't change if admin updates product price later)
 */
export const mergeOrCreateOrderProduct = async (
  dailyOrderId: string,
  productId: string,
  variationId: string,
  quantity: number,
  perQuantityPrice: number,
  snapshotWeightPerUnit: number,
  tx: any = prisma,
  method: "COD" | "Wallet"
) => {
  const totalWeight = quantity * snapshotWeightPerUnit;
  const totalPrice = quantity * perQuantityPrice;

  // Check if OrderProduct exists for this product in this order
  const existingOrderProduct = await tx.orderProduct.findUnique({
    where: {
      orderId_productId: {
        orderId: dailyOrderId,
        productId: productId,
      },
    },
    include: {
      OrderProductVariation: true,
    },
  });

  if (existingOrderProduct) {
    // MERGE: Update existing product
    // Check if this variation already exists
    const existingVariation = existingOrderProduct.OrderProductVariation.find(
      (v: any) => v.variationId === variationId
    );

    if (existingVariation) {
      // Update variation quantity
      await tx.orderProductVariation.update({
        where: { id: existingVariation.id },
        data: {
          quantity: { increment: quantity },
        },
      });
    } else {
      // Add new variation to this product
      await tx.orderProductVariation.create({
        data: {
          orderProductId: existingOrderProduct.id,
          variationId,
          quantity,
        },
      });
    }

    // Update OrderProduct totals (atomic increment)
    const updatedOrderProduct = await tx.orderProduct.update({
      where: { id: existingOrderProduct.id },
      data: {
        totalWeight: { increment: totalWeight },
        totalPrice: { increment: totalPrice },
        totalWalletAmountUsed:
          method === "Wallet" ? { increment: totalPrice } : undefined,
      },
      include: {
        OrderProductVariation: true,
      },
    });

    return updatedOrderProduct;
  } else {
    // CREATE: New product in order
    const newOrderProduct = await tx.orderProduct.create({
      data: {
        orderId: dailyOrderId,
        productId,
        totalWeight,
        totalPrice,
        status: "Active",
        totalWalletAmountUsed: method === "Wallet" ? totalPrice : 0,
        OrderProductVariation: {
          create: {
            variationId,
            quantity,
          },
        },
      },
      include: {
        OrderProductVariation: true,
      },
    });

    return newOrderProduct;
  }
};

/**
 * Update totalProductOrder aggregation for the day
 * Tracks total orders, weight, price, cancellations, returns per product per day
 */
export const updateDailyProductAggregation = async (
  productId: string,
  dailyOrderId: string,
  weight: number,
  price: number,
  operation: "add" | "cancel" | "return",
  tx: any = prisma,
  productCategoryId?: string,
  branchId?: string
) => {
  const dateString = getDateString();

  const existing = await tx.totalProductOrder.findUnique({
    where: {
      productId_orderDateString: {
        productId,
        orderDateString: dateString,
      },
    },
  });

  if (operation === "add") {
    // need to calculate the totalweight and totalprice and also total save the daily order

    // need to calculate the totalweight and totalprice and also total save the daily order
    await tx.dailyOrder.update({
      where: { id: dailyOrderId },
      data: {
        totalWeight: { increment: weight },
        totalAmount: { increment: price },
      },
    });

    if (existing) {
      // Update existing aggregation
      const isNewOrder = !existing.orderIds.includes(dailyOrderId);

      await tx.totalProductOrder.update({
        where: { id: existing.id },
        data: {
          totalOrders: isNewOrder ? { increment: 1 } : existing.totalOrders,
          totalWeight: { increment: weight },
          totalPrice: { increment: price },
          orderIds: isNewOrder
            ? [...existing.orderIds, dailyOrderId]
            : existing.orderIds,
        },
      });
    } else {
      // Create new aggregation
      await tx.totalProductOrder.create({
        data: {
          productId,
          productCategoryId: productCategoryId,
          branchId: branchId,
          orderDateString: dateString,
          totalOrders: 1,
          totalQuantity: 1,
          totalWeight: weight,
          totalPrice: price,
          acceptedWeight: 0,
          rejectedWeight: 0,
          returnedWeight: 0,
          orderIds: [dailyOrderId],
          status: "Active",
        },
      });
    }
  } else if (operation === "cancel" && existing) {
    await tx.totalProductOrder.update({
      where: { id: existing.id },
      data: {
        rejectedWeight: { increment: weight },
        rejectedPrice: { increment: price },
      },
    });
  } else if (operation === "return" && existing) {
    await tx.totalProductOrder.update({
      where: { id: existing.id },
      data: {
        returnedWeight: { increment: weight },
        returnedPrice: { increment: price },
      },
    });
  }
};

/**
 * Recalculate DailyOrder total amount from all OrderProducts
 */
export const recalculateDailyOrderTotal = async (
  dailyOrderId: string,
  tx: any = prisma,
  decressRemaining : number = 0
) => {


  console.log("after rejected hit the helpers!")
  const orderProducts = await tx.orderProduct.findMany({
    where: {
      orderId: dailyOrderId,
    },
  });

  const totalAmount = orderProducts.reduce((sum: number, product: any) => {
    return sum + product.totalPrice;
  }, 0);

  console.log({totalAmount})

  const dailyOrder = await tx.dailyOrder.findUnique({
    where: { id: dailyOrderId },
  });

  if (!dailyOrder) return;

  // Calculate remaining amount based on payment method
  let remainingAmount = Number(totalAmount) - (Number(dailyOrder.walletAmountUsed) || 0);
  console.log({remainingAmount})
  // Check if it's a dues order
  const isDues = dailyOrder.paymentMethod === "Credit" && remainingAmount > 0;

  await tx.dailyOrder.update({
    where: { id: dailyOrderId },
    data: {
      totalAmount,
      RemainingAmount: remainingAmount - decressRemaining,
      isDues,
    },
  });
};

/**
 * Accept (confirm) an OrderProduct by admin
 */
export const acceptOrderProduct = async (totalOrderProductId: string) => {
  return await prisma.$transaction(async (tx) => {
    const totalOrderProduct = await tx.totalProductOrder.findUnique({
      where: { id: totalOrderProductId },
    });

    if (!totalOrderProduct) {
      throw new ApiError(httpStatus.NOT_FOUND, "Order product not found");
    }

    if (totalOrderProduct.status === "Confirmed") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Order product already confirmed"
      );
    }

    await tx.totalProductOrder.update({
      where: { id: totalOrderProductId },
      data: {
        status: "Confirmed",
        acceptedWeight: totalOrderProduct.totalWeight,
        acceptedPrice: totalOrderProduct.totalPrice,
      },
    });

    // accepted product id
    const productId = totalOrderProduct.productId;

    // fetch all order and update all and update order products status to confirmed
    const dailyOrders = await tx.dailyOrder.findMany({
      where: {
        id: { in: totalOrderProduct.orderIds },
      },
    });

    for (const order of dailyOrders) {
      const orderProducts = await tx.orderProduct.findMany({
        where: { orderId: order.id, productId },
      });

      if (orderProducts.length === 0) continue; // Skip if no product found

      const orderTotalWeight = orderProducts.reduce(
        (sum, prod) => sum + prod.totalWeight!,
        0
      );

      const orderTotalPrice = orderProducts.reduce(
        (sum, prod) => sum + prod.totalPrice!,
        0
      );

      // Update each order's products to Confirmed
      await tx.orderProduct.updateMany({
        where: { orderId: order.id, productId },
        data: {
          status: "Confirmed",
          // need to save exactly this order weight as accepted weight couse totalOrderProduct is for multiple orders
          acceptedWeight: orderTotalWeight,
          acceptedPrice: orderTotalPrice,
        },
      });

      // if all products are confirmed then update order status to confirmed // 27-11-25 - now i think when one product is confirmed then order will be active.
      await tx.dailyOrder.update({
        where: { id: order.id },
        data: {
          totalAcceptedPrice: { increment: orderTotalPrice },
          totalAcceptedWeight: { increment: orderTotalWeight },
          status: "Active",
        },
      });
    }
    return;
  });
};

/**
 * Reject (cancel) an OrderProduct by admin
 * Refunds wallet payment if applicable
 */
// export const rejectOrderProduct = async (totalorderProductId: string) => {
//   return await prisma.$transaction(async (tx) => {
//     const totalOrderProduct = await tx.totalProductOrder.findUnique({
//       where: { id: totalorderProductId },
//     });

//     if (!totalOrderProduct) {
//       throw new ApiError(httpStatus.NOT_FOUND, "Order product not found");
//     }

//     if(totalOrderProduct.status === "Confirmed")
//       throw new ApiError(httpStatus.BAD_REQUEST, "Order product already confirmed");

//     if(totalOrderProduct.status === "Cancelled")
//       throw new ApiError(httpStatus.BAD_REQUEST, "Order product already cancelled");

//     // update the totalOrderProduct status to cancelled
//     await tx.totalProductOrder.update({
//       where: { id: totalorderProductId },
//       data: {
//         status: "Cancelled",
//         rejectedWeight: { decrement: Number(totalOrderProduct.totalWeight) },
//       },
//     });

//     const orderIds = totalOrderProduct.orderIds;
//     const productId = totalOrderProduct.productId;

//     const dailyOrders = await tx.dailyOrder.findMany({
//       where: {
//         id: { in: orderIds },
//       },
//     });

//     for (const order of dailyOrders) {
//       const orderProducts = await tx.orderProduct.findMany({
//         where: { orderId: order.id, productId },
//       });

//       if (orderProducts.length === 0) continue; // Skip if no product found

//       // calculate cancelled weight and price for this order
//       const orderTotalWeight = orderProducts.reduce(
//         (sum, prod) => sum + prod.totalWeight!,
//         0
//       );

//       const orderTotalPrice = orderProducts.reduce(
//         (sum, prod) => sum + prod.totalPrice!,
//         0
//       );

//       // Update each order's products to Confirmed
//       await tx.orderProduct.updateMany({
//         where: { orderId: order.id, productId },
//         data: {
//           status: "Cancelled",
//           //need to save exactly this order weight as accepted weight couse totalOrderProduct is for multiple orders
//           rejectedWeight: orderTotalWeight,
//           rejectedPrice: orderTotalPrice,
//         },
//       });

//       // if all products are confirmed then update order status to confirmed // 27-11-25 - now i think when one product is confirmed then order will be active.

//       const isAllCancelled = await tx.orderProduct.count({
//         where: { orderId: order.id, status: { not: "Cancelled" } },
//       });

//       await tx.dailyOrder.update({
//         where: { id: order.id },
//         data: {
//           totalRejectedPrice: { increment: orderTotalPrice },
//           totalRejectedWeight: { increment: orderTotalWeight },
//           status: isAllCancelled === 0 ? "Cancelled" : "Active",
//         },
//       });

//       //---------- Refund wallet if applicable ---------------------
//       // TODO : "working" ,  need to fecth single product then check payment method and refund
//        const orderProduct = await tx.orderProduct.findUnique({
//       where: { id: orderProductId },
//       include: {
//         order: {
//           include: {
//             user: {
//               include: { Wallet: true },
//             },
//           },
//         },
//       },
//     });

//     if (!orderProduct || !orderProduct.order) {
//       throw new ApiError(httpStatus.NOT_FOUND, "Order product not found");
//     }

//     if (orderProduct.status === "Cancelled") {
//       throw new ApiError(httpStatus.BAD_REQUEST, "Product already cancelled");
//     }

//     const rejectedAmount = orderProduct.totalPrice;
//     const rejectedWeight = orderProduct.totalWeight;

//     // Mark as cancelled
//     await tx.orderProduct.update({
//       where: { id: orderProductId },
//       data: {
//         status: "Cancelled",
//         rejectedWeight: orderProduct.totalWeight,
//       },
//     });

//     // Refund wallet if payment was Wallet
//     if (
//       orderProduct.order.paymentMethod === PaymentMethod.Wallet &&
//       orderProduct.order.user?.Wallet
//     ) {
//       await tx.wallet.update({
//         where: { id: orderProduct.order.user.Wallet.id },
//         data: {
//           balance: { increment: Number(rejectedAmount) },
//         },
//       });

//       await tx.walletTransaction.create({
//         data: {
//           walletId: orderProduct.order.user.Wallet.id,
//           amount: Number(rejectedAmount),
//           type: "Credit",
//           description: `Refund for rejected product (Admin rejected)`,
//           status: "Success",
//         },
//       });
//     }

//     // Update daily aggregation
//     await updateDailyProductAggregation(
//       orderProduct.productId!,
//       orderProduct.order.id,
//       Number(rejectedWeight),
//       Number(rejectedAmount),
//       "cancel",
//       tx
//     );

//     // Recalculate order total
//     await recalculateDailyOrderTotal(orderProduct.order.id, tx);

//     return {
//       message: "Product rejected successfully",
//       refundAmount: rejectedAmount,
//       refunded: orderProduct.order.paymentMethod === PaymentMethod.Wallet,
//     };

//     }

//     return;
//   });
// };

export const rejectOrderProduct = async (totalorderProductId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1) Load the totalProductOrder aggregation record
    const totalOrderProduct = await tx.totalProductOrder.findUnique({
      where: { id: totalorderProductId },
    });

    if (!totalOrderProduct) {
      throw new ApiError(httpStatus.NOT_FOUND, "Order product not found");
    }

    if (
      totalOrderProduct.status === "Confirmed" ||
      totalOrderProduct.status === "Cancelled"
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Order product already ${totalOrderProduct.status.toLowerCase()}`
      );
    }

    let decressRemaining = 0;

    // 2) Mark the totalProductOrder as cancelled (status only).
    //    We will let updateDailyProductAggregation handle weight/price adjustments per order
    await tx.totalProductOrder.update({
      where: { id: totalorderProductId },
      data: {
        status: "Cancelled",
        rejectedWeight: totalOrderProduct.totalWeight,
        rejectedPrice: totalOrderProduct.totalPrice,
      },
    });

    const orderIds = totalOrderProduct.orderIds || [];
    const productId = totalOrderProduct.productId;

    // 3) Fetch all related daily orders
    const dailyOrders = await tx.dailyOrder.findMany({
      where: {
        id: { in: orderIds },
      },
    });

    // 4) Iterate each daily order and process cancellation for that specific product
    for (const order of dailyOrders) {
      // a) fetch orderProducts for this order & product, INCLUDING order->user->Wallet for refund info
      const orderProducts = await tx.orderProduct.findMany({
        where: { orderId: order.id, productId },
        include: {
          order: {
            include: {
              OrderProducts: true,
              user: {
                include: { Wallet: true },
              },
            },
          },
        },
      });

      if (!orderProducts || orderProducts.length === 0) continue; // nothing to cancel for this order

      // b) calculate cancelled weight & price for this order (for that product)
      const orderTotalWeight = orderProducts.reduce(
        (sum, p) => sum + Number(p.totalWeight || 0),
        0
      );
      const orderTotalPrice = orderProducts.reduce(
        (sum, p) => sum + Number(p.totalPrice || 0),
        0
      );

      // c) Update these orderProducts -> mark as Cancelled and set rejected fields
      await tx.orderProduct.updateMany({
        where: { orderId: order.id, productId },
        data: {
          status: "Cancelled",
          rejectedWeight: orderTotalWeight,
          rejectedPrice: orderTotalPrice,
        },
      });

      // d) Update dailyOrder aggregates (per-order)
      //    increment totalRejected*, and set status Cancelled if all products cancelled
      const nonCancelledCount = await tx.orderProduct.count({
        where: { orderId: order.id, status: { not: "Cancelled" } },
      });

      await tx.dailyOrder.update({
        where: { id: order.id },
        data: {
          totalRejectedWeight: { increment: orderTotalWeight },
          totalRejectedPrice: { increment: orderTotalPrice },
          status: nonCancelledCount === 0 ? "Cancelled" : "Active",
        },
      });

      // e) Update global per-product daily aggregation (totalProductOrder record)
      //    this will: rejectedWeight += weight, totalWeight -= weight, totalPrice -= price
      //    (implementation of updateDailyProductAggregation already handles these changes)
      await updateDailyProductAggregation(
        productId!,
        order.id,
        orderTotalWeight,
        orderTotalPrice,
        "cancel",
        tx
      );

      // f) Refund wallet if this order used Wallet payment
      //    Use the order relation attached to any orderProduct (all have same order)
      const orderRelation = orderProducts[0].order?.OrderProducts.find(
        (op) => op.productId === productId
      );
      const user = orderProducts[0].order?.user;
      if (
        orderRelation &&
        orderRelation.totalWalletAmountUsed &&
        user?.Wallet
      ) {
        const walletId = user.Wallet.id;
        const refundAmount = orderRelation.totalWalletAmountUsed; 
        decressRemaining = orderTotalPrice - refundAmount;

        //✅DONE : Ai amount  ta ai order er sokol product er jonno wallet theke use kora hoyeche amd bujte hobe exactly ai product er jonno koto ta use hoyeche then sei amount ta refund korte hobe

        if (refundAmount > 0) {
          await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: refundAmount } }, // refundAmountUsingWallet
          });

          await tx.walletTransaction.create({
            data: {
              walletId,
              amount: refundAmount,
              type: "Credit",
              description: "Refund for rejected product (Admin rejected)",
              status: "Success",
            },
          });
        }
      }

      // g) Recalculate daily order total (skip cancelled products internally)
      await recalculateDailyOrderTotal(order.id, tx , decressRemaining);
    }

    return { message: "Product(s) rejected successfully" };
  });
};

/**
 * Adjust OrderProduct quantity by delivery driver
 * Can reduce quantity or fully cancel
 */
export const adjustOrderProductByDriver = async (
  orderProductId: string,
  newWeight: number,
  userId: string,
  reason?: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== UserRole.Driver) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Only delivery driver can adjust quantities"
    );
  }

  return await prisma.$transaction(async (tx) => {
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

    const originalWeight = orderProduct.totalWeight;
    const originalPrice = orderProduct.totalPrice;

    if (newWeight < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Weight cannot be negative");
    }

    if (newWeight === 0) {
      // Fully cancel/return
      const returnedWeight = originalWeight;
      const returnedAmount = originalPrice;

      await tx.orderProduct.update({
        where: { id: orderProductId },
        data: {
          status: "Returned",
          returnedWeight: returnedWeight,
          totalWeight: 0,
          totalPrice: 0,
        },
      });

      // Refund wallet if applicable
      if (
        orderProduct.order.paymentMethod === PaymentMethod.Wallet &&
        orderProduct.order.user?.Wallet
      ) {
        await tx.wallet.update({
          where: { id: orderProduct.order.user.Wallet.id },
          data: {
            balance: { increment: Number(returnedAmount) },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: orderProduct.order.user.Wallet.id,
            amount: Number(returnedAmount),
            type: "Credit",
            description: `Refund for returned product (${
              reason || "Delivery return"
            })`,
            status: "Success",
          },
        });
      }

      // Update daily aggregation
      await updateDailyProductAggregation(
        orderProduct.productId!,
        orderProduct.order.id,
        Number(returnedWeight),
        Number(returnedAmount),
        "return",
        tx
      );

      // Recalculate order total
      await recalculateDailyOrderTotal(orderProduct.order.id, tx);

      return {
        message: "Product fully returned",
        returnedAmount,
        refunded: orderProduct.order.paymentMethod === PaymentMethod.Wallet,
      };
    } else {
      // Partial reduction
      const reducedWeight = Number(originalWeight) - newWeight;
      const pricePerKg = Number(originalPrice) / Number(originalWeight);
      const reducedPrice = reducedWeight * pricePerKg;
      const newPrice = newWeight * pricePerKg;

      await tx.orderProduct.update({
        where: { id: orderProductId },
        data: {
          totalWeight: newWeight,
          totalPrice: newPrice,
          returnedWeight: { increment: reducedWeight },
        },
      });

      // Refund wallet for reduced amount
      if (
        orderProduct.order.paymentMethod === PaymentMethod.Wallet &&
        orderProduct.order.user?.Wallet
      ) {
        await tx.wallet.update({
          where: { id: orderProduct.order.user.Wallet.id },
          data: {
            balance: { increment: Number(reducedPrice) },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: orderProduct.order.user.Wallet.id,
            amount: Number(reducedPrice),
            type: "Credit",
            description: `Partial refund for reduced quantity (${
              reason || "Delivery adjustment"
            })`,
            status: "Success",
          },
        });
      }

      // Update daily aggregation
      await updateDailyProductAggregation(
        orderProduct.productId!,
        orderProduct.order.id,
        reducedWeight,
        reducedPrice,
        "return",
        tx
      );

      // Recalculate order total
      await recalculateDailyOrderTotal(orderProduct.order.id, tx);

      return {
        message: "Product quantity adjusted",
        reducedAmount: reducedPrice,
        refunded: orderProduct.order.paymentMethod === PaymentMethod.Wallet,
      };
    }
  });
};

/**
 * Get daily product summary (for admin dashboard)
 */
export const getDailyProductSummary = async (
  dateString?: any,
  branchId?: string,
  productCategoryId?: string
) => {
  const targetDate = dateString || getDateString();

  console.log({ targetDate });
  return await prisma.totalProductOrder.findMany({
    where: {
      orderDateString: targetDate ? targetDate : undefined,
      branchId: branchId ? branchId : undefined,
      productCategoryId: productCategoryId ? productCategoryId : undefined,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: true,
        },
      },
    },
    orderBy: {
      totalWeight: "desc",
    },
  });
};

/**
 * Get all daily orders for a specific date
 */
export const getDailyOrders = async (dateString?: string) => {
  const targetDate = dateString || getDateString();

  return await prisma.dailyOrder.findMany({
    where: {
      orderDate: targetDate,
    },
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
 * Generate unique order ID
 */
export const generateOrderId = (): string => {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

/**
 * Get or create MainOrder for today for a user
 */
export const getOrCreateTodayMainOrder = async (userId: string, tx: any = prisma) => {
  const today = new Date();
  const now = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  // Try to find existing ACTIVE MainOrder for today (not closed)
  let mainOrder = await tx.mainOrder.findFirst({
    where: {
      userId,
      orderDate: {
        gte: today,
        lte: endOfDay,
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
        orderDate: now,
      },
    });
  }

  return mainOrder;
};
