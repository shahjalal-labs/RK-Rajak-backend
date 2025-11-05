import { PrismaClient, PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { ICreateOrderPayload, IReturnOrderPayload, ICancelOrderPayload } from "./order.interface";
import { createCashfreeOrder, initiateCashfreeRefund } from "../../../helpers/cashfree";
import config from "../../../config";

const prisma = new PrismaClient();

/**
 * Generate unique order ID
 */
const generateOrderId = (): string => {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

/**
 * Place order via COD
 */
// const placeOrderCOD = async (payload: ICreateOrderPayload) => {
//   const { userId, products, shippingAddressId,  } = payload;
//   console.log({userId , products, shippingAddressId});
//   // Validate user  
//   const user = await prisma.user.findUnique({ where: { id: userId } });
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }
//   // first we need to check the product is available in db , then we need to check is variation is available in that product  after that evry product variation has availableQuantity and also maxOrderQuantity and minOrderQuantity then need to fecth the data and calculate the total price accordingly
//   const productIds = products.map((p) => p.productId);
//   const productVariations = await prisma.productVariation.findMany({
//     where: {
//       productId: { in: productIds },
//       id: { in: products.map((p) => p.variationId).filter((id): id is string => id !== undefined) },
//     },
//     include: {
//       product: true,
//     },
//   });

//   // Check if all products and variations are available
//   for (const p of products) {
//     const variation = productVariations.find((v) => v.id === p.variationId);
//     if (!variation) {
//       throw new ApiError(httpStatus.NOT_FOUND, `Variation not found for product ${p.productId}`);
//     }
//     if (variation.availableQuantity < p.quantity) {
//       throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient quantity for product ${p.productId}`);
//     }
//   }

//   // Calculate total amount  accordingly there vairation prices 
//   const totalAmount = productVariations.reduce((sum, v) => {
//     const product = products.find((p) => p.variationId === v.id);
//     return sum + (product ? Number(product.price) * Number(product.quantity) : 0);
//   }, 0);

//   console.log({ totalAmount }); // console is NAN

//   // Create order with transaction
//   const order = await prisma.order.create({
//     data: {
//       orderId: generateOrderId(),
//       userId,
//       totalAmount,
//       shippingAddressId,
//       branchId: user.branchId,
//       paymentMethod: PaymentMethod.COD,
//       paymentStatus: PaymentStatus.Pending,
//       isPaid: false,
//       status: OrderStatus.Pending,
//       products: {
//         create: products.map((p) => ({
//           productId: p.productId,
//           quantity: p.quantity,
//           price: p.price,
//         })),
//       },
//     },
//     include: {
//       products: {
//         include: {
//           product: true,
//         },
//       },
//       shippingAddress: true,
//     },
//   });

//   return order;
// };


// const placeOrderCOD = async (payload: ICreateOrderPayload) => {
//   const { userId, products, shippingAddressId } = payload;

//   // 🧩 Validate user
//   const user = await prisma.user.findUnique({ where: { id: userId } });
//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }

//   // 🧩 Collect all variationIds
//   const variationIds = products.map((p) => p.variationId);
//   if (variationIds.some((id) => !id)) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Every product must include a variationId");
//   }

//   // 🧩 Fetch all variations with product info
//   const productVariations = await prisma.productVariation.findMany({
//     where: { id: { in: variationIds as string[] } },
//     include: { product: true },
//   });

//   // 🧩 Validate product & variation availability
//   for (const p of products) {
//     const variation = productVariations.find((v) => v.id === p.variationId);
//     if (!variation) {
//       throw new ApiError(httpStatus.NOT_FOUND, `Variation not found for product ${p.productId}`);
//     }

//     if (variation.availableQuantity < p.quantity) {
//       throw new ApiError(
//         httpStatus.BAD_REQUEST,
//         `Insufficient quantity for product ${variation.product.name}`
//       );
//     }

//     // optional: check min/max order quantity
//     if (variation.minOrderQuantity && p.quantity < variation.minOrderQuantity) {
//       throw new ApiError(
//         httpStatus.BAD_REQUEST,
//         `Minimum order quantity for ${variation.product.name} is ${variation.minOrderQuantity}`
//       );
//     }
//     if (variation.maxOrderQuantity && p.quantity > variation.maxOrderQuantity) {
//       throw new ApiError(
//         httpStatus.BAD_REQUEST,
//         `Maximum order quantity for ${variation.product.name} is ${variation.maxOrderQuantity}`
//       );
//     }
//   }

//   // 🧩 Calculate total amount using variation prices
//   const totalAmount = products.reduce((sum, p) => {
//     const variation = productVariations.find((v) => v.id === p.variationId);
//     return sum + Number(variation?.price) * Number(p.quantity);
//   }, 0);

//   // 🧩 Create order
//   const order = await prisma.order.create({
//     data: {
//       orderId: generateOrderId(),
//       userId,
//       totalAmount,
//       shippingAddressId,
//       branchId: user.branchId,
//       paymentMethod: PaymentMethod.COD,
//       paymentStatus: PaymentStatus.Pending,
//       isPaid: false,
//       status: OrderStatus.Pending,
//       products: {
//         create: products.map((p) => ({
//           productId: p.productId,
//           variationId: p.variationId,
//           quantity: p.quantity,
//           price: productVariations.find((v) => v.id === p.variationId)?.price ?? 0,
//         })),
//       },
//     },
//     include: {
//       products: { include: { product: true, variation: true } },
//       shippingAddress: true,
//     },
//   });

//   return order;
// };

const placeOrderCOD = async (payload: ICreateOrderPayload) => {
  const { userId, products, shippingAddressId } = payload;

  // ✅ Validate user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // ✅ Fetch all products (with variations)
  const productIds = products.map((p) => p.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      productVariation: true,
    },
  });

  // ✅ Validate each product and variation
  let totalAmount = 0;

  for (const p of products) {
    // Find product in DB
    const dbProduct = dbProducts.find((prod) => prod.id === p.productId);
    if (!dbProduct) {
      throw new ApiError(httpStatus.NOT_FOUND, `Product not found: ${p.productId}`);
    }

    // Variation must exist
    const variation = dbProduct.productVariation.find(
      (v) => v.id === p.variationId
    );
    if (!variation) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Variation not found for product: ${dbProduct.name}`
      );
    }

    // Check available quantity
    if (variation.availableQuantity < p.quantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Insufficient quantity for ${dbProduct.name}`
      );
    }

    // Check min/max order quantity
    if (variation.minOrderQuantity && p.quantity < variation.minOrderQuantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Minimum order quantity for ${dbProduct.name} is ${variation.minOrderQuantity}`
      );
    }
    if (variation.maxOrderQuantity && p.quantity > variation.maxOrderQuantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Maximum order quantity for ${dbProduct.name} is ${variation.maxOrderQuantity}`
      );
    }

    // Calculate total based on sellingPrice
    totalAmount += variation.sellingPrice * p.quantity;
  }
  console.log({totalAmount})

  // ✅ Create order
  const order = await prisma.order.create({
    data: {
      orderId: generateOrderId(),
      userId,
      totalAmount,
      shippingAddressId,
      branchId: user.branchId,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.Pending,
      isPaid: false,
      status: OrderStatus.Pending,
      products: {
        create: products.map((p) => ({
          product: {
            connect: { id: p.productId },
          },
          variationId: p.variationId,
          quantity: p.quantity,
          price:
            dbProducts
              .find((prod) => prod.id === p.productId)
              ?.productVariation.find((v) => v.id === p.variationId)
              ?.sellingPrice || 0,
        })),
      },
    },
    include: {
      products: {
        include: {
          product: true,
        },
      },
      shippingAddress: true,
    },
  });

  return order;
};


/**
 * Place order via Online Payment (Cashfree)
 */
const placeOrderOnline = async (payload: ICreateOrderPayload) => {
  const { userId, products, shippingAddressId, branchId } = payload;

  // Validate user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Calculate total amount
  const totalAmount = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  const orderId = generateOrderId();

  // TODO: Create Cashfree payment order
  // const cashfreeOrder = await createCashfreeOrder({
  //   orderId,
  //   amount: totalAmount,
  //   customerName: user.fullName || user.phone,
  //   customerPhone: user.phone,
  //   customerEmail: user.email,
  //   returnUrl: `${config.backend_base_url}/api/order/verify-payment`,
  // });

  // Create order in database (payment pending)
  const order = await prisma.order.create({
    data: {
      orderId,
      userId,
      totalAmount,
      shippingAddressId,
      branchId,
      paymentMethod: PaymentMethod.Online,
      paymentStatus: PaymentStatus.Pending,
      paymentGateway: "cashfree",
      // cashfreeOrderId: cashfreeOrder.order_id,
      // paymentSessionId: cashfreeOrder.payment_session_id,
      onlineAmountPaid: 0, // Will be updated after payment success
      isPaid: false,
      status: OrderStatus.Pending,
      products: {
        create: products.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
          price: p.price,
        })),
      },
    },
    include: {
      products: {
        include: {
          product: true,
        },
      },
      shippingAddress: true,
    },
  });

  return {
    order,
    // paymentSessionId: cashfreeOrder.payment_session_id,
    // cashfreeOrderId: cashfreeOrder.order_id,
    message: "TODO: Implement Cashfree payment integration. Redirect user to payment link.",
  };
};

/**
 * Place order via Wallet
 */
const placeOrderWallet = async (payload: ICreateOrderPayload) => {
  const { userId, products, shippingAddressId, branchId } = payload;

  // Validate user
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

  // Calculate total amount
  const totalAmount = products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  // Check wallet balance
  if (user.Wallet.balance < totalAmount) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient wallet balance. Available: ₹${user.Wallet.balance}, Required: ₹${totalAmount}`
    );
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Deduct wallet balance
    const updatedWallet = await tx.wallet.update({
      where: { id: user.Wallet!.id },
      data: {
        balance: {
          decrement: totalAmount,
        },
      },
    });

    // Create order
    const order = await tx.order.create({
      data: {
        orderId: generateOrderId(),
        userId,
        totalAmount,
        shippingAddressId,
        branchId,
        paymentMethod: PaymentMethod.Wallet,
        paymentStatus: PaymentStatus.Success,
        walletAmountUsed: totalAmount,
        isPaid: true,
        status: OrderStatus.Pending,
        products: {
          create: products.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
            price: p.price,
          })),
        },
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
    });

    // Record wallet transaction
    await tx.walletTransaction.create({
      data: {
        walletId: user.Wallet!.id,
        amount: totalAmount,
        type: "Debit",
        description: `Payment for order ${order.orderId}`,
        orderId: order.id,
        status: "Success",
      },
    });

    return { order, wallet: updatedWallet };
  });

  return result;
};

/**
 * Main function to place order based on payment method
 */
const createOrder = async (payload: ICreateOrderPayload) => {
  switch (payload.paymentMethod) {
    case "COD":
      return await placeOrderCOD(payload);
    case "Online":
      return await placeOrderOnline(payload);
    case "Wallet":
      return await placeOrderWallet(payload);
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payment method");
  }
};

/**
 * Cancel order (full or partial product cancellation)
 */

const cancelOrder = async (payload: ICancelOrderPayload) => {
  const { orderId, userId, products: cancelProducts } = payload;

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      products: true,
      user: {
        include: {
          Wallet: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  // Check if order can be cancelled
  if (order.status === OrderStatus.Delivered) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot cancel delivered order. Please use return instead."
    );
  }

  if (order.status === OrderStatus.Cancelled || order.status === OrderStatus.FullyReturned) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Order is already ${order.status.toLowerCase()}`
    );
  }

  // Determine if full or partial cancellation
  const isFullCancellation = !cancelProducts || cancelProducts.length === 0;

  let totalCancelAmount = 0;
  let cancelUpdates: any[] = [];

  if (isFullCancellation) {
    // Full order cancellation
    totalCancelAmount = order.totalAmount - (order.totalReturnedAmount || 0);
    
    // Mark all products as cancelled
    cancelUpdates = order.products.map((op) => ({
      orderProductId: op.id,
      cancelQuantity: op.quantity - op.returnedQuantity,
      newReturnedQuantity: op.quantity,
      isFullyCancelled: true,
    }));
  } else {
    // Partial product cancellation
    cancelUpdates = cancelProducts!.map((cp) => {
      const orderProduct = order.products.find((op) => op.id === cp.orderProductId);
      if (!orderProduct) {
        throw new ApiError(httpStatus.NOT_FOUND, `Order product ${cp.orderProductId} not found`);
      }

      const availableQuantity = orderProduct.quantity - orderProduct.returnedQuantity;
      if (cp.cancelQuantity > availableQuantity) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Cannot cancel ${cp.cancelQuantity} units. Available: ${availableQuantity}`
        );
      }

      const cancelAmount = orderProduct.price * cp.cancelQuantity;
      totalCancelAmount += cancelAmount;

      return {
        orderProductId: cp.orderProductId,
        cancelQuantity: cp.cancelQuantity,
        newReturnedQuantity: orderProduct.returnedQuantity + cp.cancelQuantity,
        isFullyCancelled: orderProduct.returnedQuantity + cp.cancelQuantity === orderProduct.quantity,
      };
    });
  }

  // Check if all products are now cancelled
  const allProductsCancelled = isFullCancellation || order.products.every((op) => {
    const cancelUpdate = cancelUpdates.find((cu) => cu.orderProductId === op.id);
    if (cancelUpdate) {
      return cancelUpdate.isFullyCancelled;
    }
    return op.returnedQuantity === op.quantity;
  });

  // Process cancellation with transaction
  await prisma.$transaction(async (tx) => {
    // Update order products
    for (const update of cancelUpdates) {
      await tx.orderProduct.update({
        where: { id: update.orderProductId },
        data: {
          returnedQuantity: update.newReturnedQuantity,
          isReturned: update.isFullyCancelled,
        },
      });
    }

    // Update order
    await tx.order.update({
      where: { id: orderId },
      data: {
        isReturned: true,
        isPartialReturn: !allProductsCancelled,
        totalReturnedAmount: (order.totalReturnedAmount || 0) + totalCancelAmount,
        status: allProductsCancelled ? OrderStatus.Cancelled : OrderStatus.PartiallyReturned,
      },
    });

    // Process refund based on payment method
    if (order.paymentMethod === PaymentMethod.Wallet && totalCancelAmount > 0) {
      // Refund to wallet
      await tx.wallet.update({
        where: { id: order.user!.Wallet!.id },
        data: {
          balance: {
            increment: totalCancelAmount,
          },
        },
      });

      // Record wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: order.user!.Wallet!.id,
          amount: totalCancelAmount,
          type: "Credit",
          description: `Refund for ${isFullCancellation ? "cancelled" : "partially cancelled"} order ${order.orderId}`,
          orderId: order.id,
          status: "Success",
        },
      });
    } else if (order.paymentMethod === PaymentMethod.Online && order.isPaid && totalCancelAmount > 0) {
      // TODO: Initiate online refund via Cashfree
      // const refundId = `REFUND${Date.now()}`;
      // await initiateCashfreeRefund({
      //   orderId: order.cashfreeOrderId!,
      //   refundId,
      //   refundAmount: totalCancelAmount,
      //   refundNote: `${isFullCancellation ? "Full" : "Partial"} cancellation of order ${order.orderId}`,
      // });

      // Update order with refund info
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: allProductsCancelled ? PaymentStatus.Refunded : PaymentStatus.PartiallyRefunded,
        },
      });
    }
    // COD orders don't need refund
  });

  return {
    message: `Order ${isFullCancellation ? "fully" : "partially"} cancelled successfully`,
    cancelledAmount: totalCancelAmount,
  };
};

/**
 * Return order (partial or full)
 */
const returnOrder = async (payload: IReturnOrderPayload) => {
  const { orderId, userId, products: returnProducts } = payload;

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      products: true,
      user: {
        include: {
          Wallet: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  // Check if order can be returned
  if (order.status !== OrderStatus.Delivered) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Only delivered orders can be returned"
    );
  }

  // Validate return products
  let totalReturnAmount = 0;
  let isFullReturn = true;

  const returnUpdates = returnProducts.map((rp) => {
    const orderProduct = order.products.find((op) => op.id === rp.orderProductId);
    if (!orderProduct) {
      throw new ApiError(httpStatus.NOT_FOUND, `Order product ${rp.orderProductId} not found`);
    }

    const availableQuantity = orderProduct.quantity - orderProduct.returnedQuantity;
    if (rp.returnQuantity > availableQuantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot return ${rp.returnQuantity} units. Available: ${availableQuantity}`
      );
    }

    const returnAmount = (orderProduct.price * rp.returnQuantity);
    totalReturnAmount += returnAmount;

    // Check if partial return
    if (orderProduct.returnedQuantity + rp.returnQuantity < orderProduct.quantity) {
      isFullReturn = false;
    }

    return {
      orderProductId: rp.orderProductId,
      returnQuantity: rp.returnQuantity,
      newReturnedQuantity: orderProduct.returnedQuantity + rp.returnQuantity,
      isFullyReturned: orderProduct.returnedQuantity + rp.returnQuantity === orderProduct.quantity,
    };
  });

  // Check if all products are fully returned
  const allProductsReturned = order.products.every((op) => {
    const returnUpdate = returnUpdates.find((ru) => ru.orderProductId === op.id);
    if (returnUpdate) {
      return returnUpdate.isFullyReturned;
    }
    return op.returnedQuantity === op.quantity;
  });

  // Process return with transaction
  await prisma.$transaction(async (tx) => {
    // Update order products
    for (const update of returnUpdates) {
      await tx.orderProduct.update({
        where: { id: update.orderProductId },
        data: {
          returnedQuantity: update.newReturnedQuantity,
          isReturned: update.isFullyReturned,
        },
      });
    }

    // Update order
    await tx.order.update({
      where: { id: orderId },
      data: {
        isReturned: true,
        isPartialReturn: !allProductsReturned,
        totalReturnedAmount: (order.totalReturnedAmount || 0) + totalReturnAmount,
        status: allProductsReturned ? OrderStatus.FullyReturned : OrderStatus.PartiallyReturned,
      },
    });

    // Process refund based on payment method
    if (order.paymentMethod === PaymentMethod.Wallet && totalReturnAmount > 0) {
      // Refund to wallet
      await tx.wallet.update({
        where: { id: order.user!.Wallet!.id },
        data: {
          balance: {
            increment: totalReturnAmount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: order.user!.Wallet!.id,
          amount: totalReturnAmount,
          type: "Credit",
          description: `Refund for returned items from order ${order.orderId}`,
          orderId: order.id,
          status: "Success",
        },
      });
    } else if (order.paymentMethod === PaymentMethod.Online && order.isPaid && totalReturnAmount > 0) {
      // TODO: Initiate partial/full refund via Cashfree
      // const refundId = `REFUND${Date.now()}`;
      // await initiateCashfreeRefund({
      //   orderId: order.cashfreeOrderId!,
      //   refundId,
      //   refundAmount: totalReturnAmount,
      //   refundNote: `Return for order ${order.orderId}`,
      // });

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: allProductsReturned ? PaymentStatus.Refunded : PaymentStatus.PartiallyRefunded,
        },
      });
    }
    // COD returns don't process refund (handled separately in cash)
  });

  return {
    message: `Order ${allProductsReturned ? "fully" : "partially"} returned successfully`,
    totalReturnAmount,
  };
};

/**
 * Get all orders
 */
const getAllOrders = async () => {
  return await prisma.order.findMany({
    include: {
      products: {
        include: {
          product: true,
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
      branch: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Get order by ID
 */
const getOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: true,
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
      branch: true,
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

/**
 * Get user orders
 */
const getUserOrders = async (userId: string) => {
  return await prisma.order.findMany({
    where: { userId },
    include: {
      products: {
        include: {
          product: true,
        },
      },
      shippingAddress: true,
      branch: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Update order status
 */
const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  return await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      products: {
        include: {
          product: true,
        },
      },
    },
  });
};

/**
 * Delete order (soft delete by marking as cancelled)
 */
const deleteOrder = async (id: string) => {
  const isExist = await prisma.order.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  return await prisma.order.update({
    where: { id },
    data: { status: OrderStatus.Cancelled },
  });
};

export const orderServices = {
  createOrder,
  placeOrderCOD,
  placeOrderOnline,
  placeOrderWallet,
  cancelOrder,
  returnOrder,
  getAllOrders,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  deleteOrder,
};
