import {
  PrismaClient,
  PaymentMethod,
  OrderStatus,
  MainOrderStatus,
  UserRole,
} from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { branch, product } from "@prisma/client";
import {
  ICreateOrderPayload,
  IReturnOrderPayload,
  ICancelOrderPayload,
  ICreateOrderPayloadByAgentForCustomer,
  AssignOrdersPayload,
} from "./order.interface";

const prisma = new PrismaClient();

/**
 * Generate unique order ID
 */
const generateOrderId = (): string => {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

/**
 * Get or create MainOrder for today for a user
 */
const getOrCreateTodayMainOrder = async (userId: string, tx: any = prisma) => {
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

/**
 * Recalculate MainOrder totals from all its orders
 */
const recalculateMainOrder = async (mainOrderId: string, tx: any = prisma) => {
  // Get all orders in this MainOrder
  const orders = await tx.order.findMany({
    where: { mainOrderId },
  });

  if (orders.length === 0) {
    return;
  }

  // Calculate totals
  const totalAmount = orders.reduce(
    (sum: number, order: any) => sum + order.totalAmount,
    0
  );
  const totalReturnedAmount = orders.reduce(
    (sum: number, order: any) => sum + (order.totalReturnedAmount || 0),
    0
  );
  const totalWalletUsed = orders.reduce(
    (sum: number, order: any) => sum + (order.walletAmountUsed || 0),
    0
  );

  // Calculate pending amount (COD orders that aren't fully returned)
  const pendingAmount = orders.reduce((sum: number, order: any) => {
    if (
      order.paymentMethod === "COD" &&
      order.status !== "Cancelled" &&
      order.status !== "FullyReturned"
    ) {
      return sum + (order.totalAmount - (order.totalReturnedAmount || 0));
    }
    return sum;
  }, 0);

  // Calculate dues amount (Credit orders that aren't cleared)
  const totalDuesAmount = orders.reduce((sum: number, order: any) => {
    if (order.isDues && !order.duesCleared) {
      return sum + (order.totalAmount - (order.totalReturnedAmount || 0));
    }
    return sum;
  }, 0);

  // Check if all dues are cleared
  const isDuesCleared = !orders.some(
    (order: any) => order.isDues && !order.duesCleared
  );

  // Update MainOrder
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
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Product not found: ${p.productId}`
      );
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
  console.log({ totalAmount });

  // ✅ Create order and merge into MainOrder in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Get or create today's MainOrder
    const mainOrder = await getOrCreateTodayMainOrder(userId, tx);

    // Create order linked to MainOrder
    const order = await tx.order.create({
      data: {
        orderId: generateOrderId(),
        userId,
        totalAmount,
        shippingAddressId,
        branchId: user.branchId,
        paymentMethod: PaymentMethod.COD,
        isPaid: false,
        status: OrderStatus.Pending,
        mainOrderId: mainOrder.id,
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
        mainOrder: true,
      },
    });

    // Recalculate MainOrder totals
    await recalculateMainOrder(mainOrder.id, tx);

    return order;
  });

  return result;
};
const createOrderByAgentForCustomer = async (
  payload: ICreateOrderPayloadByAgentForCustomer
) => {
  const { userId, customerId, products, shippingAddressId } = payload;

  // ✅ Validate user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // is customer exist
  const isCustomerExist = await prisma.user.findUnique({
    where: { id: customerId },
  });
  if (!isCustomerExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  }
  // check is customer exist but not for this agent customer  - 1 fetch this agent all customers and check is exist
  const isCustomerForThisAgent = await prisma.user.findFirst({
    where: {
      id: customerId,
      agentId: userId,
    },
  });
  if (!isCustomerForThisAgent) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "This customer does not belong to you"
    );
  }

  // is customer exist but there shipping address not exist
  const isShippingExist = await prisma.shippingAddress.findUnique({
    where: {
      id: shippingAddressId,
    },
  });
  if (!isShippingExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Shipping address not found");
  }
  // is shipping address belong to customer
  const isShippingBelongToCustomer = isShippingExist.userId === customerId;
  if (!isShippingBelongToCustomer) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Shipping address does not belong to customer"
    );
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
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Product not found: ${p.productId}`
      );
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

    // Calculate total based on price who comes from payload
    totalAmount += p.price;
  }
  console.log({ totalAmount });

  // ✅ Create order and merge into MainOrder in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Get or create today's MainOrder
    const mainOrder = await getOrCreateTodayMainOrder(customerId, tx);

    // Create order linked to MainOrder
    const order = await tx.order.create({
      data: {
        orderId: generateOrderId(),
        userId: customerId,
        totalAmount,
        shippingAddressId,
        branchId: isCustomerExist.branchId,
        paymentMethod: PaymentMethod.COD,
        isPaid: false,
        status: OrderStatus.Pending,
        mainOrderId: mainOrder.id,
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
        mainOrder: true,
      },
    });

    // Recalculate MainOrder totals
    await recalculateMainOrder(mainOrder.id, tx);

    return order;
  });

  return result;
};

/**
 * Place order via Wallet
 */
const placeOrderWallet = async (payload: ICreateOrderPayload) => {
  const { userId, products, shippingAddressId } = payload;

  // ✅ Validate user
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
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Product not found: ${p.productId}`
      );
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
  console.log({ totalAmount });
  // Check wallet balance
  if (user.Wallet.balance < totalAmount) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient wallet balance. Available: ₹${user.Wallet.balance}, Required: ₹${totalAmount}`
    );
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Get or create today's MainOrder
    const mainOrder = await getOrCreateTodayMainOrder(userId, tx);

    // Deduct wallet balance
    const updatedWallet = await tx.wallet.update({
      where: { id: user.Wallet!.id },
      data: {
        balance: {
          decrement: totalAmount,
        },
      },
    });

    // Create order linked to MainOrder
    const order = await tx.order.create({
      data: {
        orderId: generateOrderId(),
        userId,
        totalAmount,
        shippingAddressId,
        branchId: user.branchId,
        paymentMethod: PaymentMethod.Wallet,
        walletAmountUsed: totalAmount,
        isPaid: true,
        status: OrderStatus.Pending,
        mainOrderId: mainOrder.id,
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
        mainOrder: true,
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

    // Recalculate MainOrder totals
    await recalculateMainOrder(mainOrder.id, tx);

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
    case "Wallet":
      return await placeOrderWallet(payload);
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payment method");
  }
};

/**
 * Cancel order (full or partial product cancellation)
 */

//!@TODO: Refactor common logic between cancelOrder and returnOrder -- Cancel ONLY The ADMIN and SUPERADMIN
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

  if (
    order.status === OrderStatus.Cancelled ||
    order.status === OrderStatus.FullyReturned
  ) {
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
      const orderProduct = order.products.find(
        (op) => op.id === cp.orderProductId
      );
      if (!orderProduct) {
        throw new ApiError(
          httpStatus.NOT_FOUND,
          `Order product ${cp.orderProductId} not found`
        );
      }

      const availableQuantity =
        orderProduct.quantity - orderProduct.returnedQuantity;
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
        isFullyCancelled:
          orderProduct.returnedQuantity + cp.cancelQuantity ===
          orderProduct.quantity,
      };
    });
  }

  // Check if all products are now cancelled
  const allProductsCancelled =
    isFullCancellation ||
    order.products.every((op) => {
      const cancelUpdate = cancelUpdates.find(
        (cu) => cu.orderProductId === op.id
      );
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
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        isReturned: true,
        isPartialReturn: !allProductsCancelled,
        totalReturnedAmount:
          (order.totalReturnedAmount || 0) + totalCancelAmount,
        // status: allProductsCancelled ? OrderStatus.Cancelled : OrderStatus.PartiallyReturned,
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
          description: `Refund for ${
            isFullCancellation ? "cancelled" : "partially cancelled"
          } order ${order.orderId}`,
          orderId: order.id,
          status: "Success",
        },
      });
    }
    // COD and Credit orders don't need refund

    // Recalculate MainOrder totals if order is linked to MainOrder
    if (updatedOrder.mainOrderId) {
      await recalculateMainOrder(updatedOrder.mainOrderId, tx);
    }
  });

  return {
    message: `Order ${
      isFullCancellation ? "fully" : "partially"
    } cancelled successfully`,
    cancelledAmount: totalCancelAmount,
  };
};

/**
 * Return order (partial or full)
 */
//!@ TODO  : Return order By The Delivery Boy
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
    const orderProduct = order.products.find(
      (op) => op.id === rp.orderProductId
    );
    if (!orderProduct) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Order product ${rp.orderProductId} not found`
      );
    }

    const availableQuantity =
      orderProduct.quantity - orderProduct.returnedQuantity;
    if (rp.returnQuantity > availableQuantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot return ${rp.returnQuantity} units. Available: ${availableQuantity}`
      );
    }

    const returnAmount = orderProduct.price * rp.returnQuantity;
    totalReturnAmount += returnAmount;

    // Check if partial return
    if (
      orderProduct.returnedQuantity + rp.returnQuantity <
      orderProduct.quantity
    ) {
      isFullReturn = false;
    }

    return {
      orderProductId: rp.orderProductId,
      returnQuantity: rp.returnQuantity,
      newReturnedQuantity: orderProduct.returnedQuantity + rp.returnQuantity,
      isFullyReturned:
        orderProduct.returnedQuantity + rp.returnQuantity ===
        orderProduct.quantity,
    };
  });

  // Check if all products are fully returned
  const allProductsReturned = order.products.every((op) => {
    const returnUpdate = returnUpdates.find(
      (ru) => ru.orderProductId === op.id
    );
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
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        isReturned: true,
        isPartialReturn: !allProductsReturned,
        totalReturnedAmount:
          (order.totalReturnedAmount || 0) + totalReturnAmount,
        // status: allProductsReturned ? OrderStatus.FullyReturned : OrderStatus.PartiallyReturned,
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
    }
    // COD returns don't process refund (handled separately in cash)

    // Recalculate MainOrder totals if order is linked to MainOrder
    if (updatedOrder.mainOrderId) {
      await recalculateMainOrder(updatedOrder.mainOrderId, tx);
    }
  });

  return {
    message: `Order ${
      allProductsReturned ? "fully" : "partially"
    } returned successfully`,
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

/**
 * Get all MainOrders (for admin)
 */
const getAllMainOrders = async () => {
  return await prisma.mainOrder.findMany({
    select: {
      id: true,
      totalAmount: true,
      pendingAmount: true,
      totalDuesAmount: true,
      totalWalletUsed: true,
      totalReturnedAmount: true,
      isDuesCleared: true,
      status: true,
      orderDate: true,
      deliveryDate: true,
      createdAt: true,
      updatedAt: true,
      orders: {
        select: {
          id: true,
          orderId: true,
          totalAmount: true,
          status: true,
          paymentMethod: true,
          isDues: true,
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      orderDate: "desc",
    },
  });
};

/**
 * Get MainOrder by ID
 */
const getMainOrderById = async (id: string) => {
  const mainOrder = await prisma.mainOrder.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          products: {
            include: {
              product: true,
            },
          },
          shippingAddress: true,
          branch: true,
        },
      },
    },
  });

  if (!mainOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, "Main order not found");
  }

  return mainOrder;
};

/**
 * Get user's MainOrders
 */
const getUserMainOrders = async (userId: string, queryParams: any) => {
  const { status } = queryParams;
  let where: any = { userId };

  if (status === "Active") {
    where = {
      userId,
      // if active then send  Pending Processing onTheway both data
      status: {
        in: [
          MainOrderStatus.Pending,
          MainOrderStatus.Processing,
          MainOrderStatus.onTheway,
        ],
      },
    };
  }
  if (status === "Completed") {
    where = {
      userId,
      status: {
        in: [
          MainOrderStatus.Delivered,
          MainOrderStatus.deliveredWithPartiallyReturned,
        ],
      },
    };
  }

  if (status === "Cancelled") {
    where = {
      userId,
      status: MainOrderStatus.Cancelled,
    };
  }

  if (status === "Returned") {
    where = {
      userId,
      status: {
        in: [
          MainOrderStatus.FullyReturned,
          MainOrderStatus.deliveredWithPartiallyReturned,
        ],
      },
    };
  }

  return await prisma.mainOrder.findMany({
    where,
    include: {
      orders: {
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      },
    },
    orderBy: {
      orderDate: "desc",
    },
  });
};

//@ --------------// Agent Customers Orders ---------------------

const getMyCustomerOrders = async (userId: string, queryParams: any) => {
  const { startDate, endDate } = queryParams;
  console.log(startDate, endDate);

  if (!userId) {
    throw new Error("User ID is required");
  }

  // Fetch all customers for this agent
  const customers = await prisma.user.findMany({
    where: { agentId: userId },
    select: { id: true },
  });

  const customerIds = customers.map((c) => c.id);

  if (customerIds.length === 0) {
    // No customers found for this agent
    return [];
  }

  const where: any = {
    userId: { in: customerIds },
  };

  // Apply date filters if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    // assign end date as like midnight of the end date
    end.setHours(23, 59, 59, 999);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid date format. Please provide valid dates."
      );
    }

    where.orderDate = {
      gte: start,
      lte: end,
    };
  } else if (startDate) {
    const start = new Date(startDate);

    if (isNaN(start.getTime())) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid start date format. Please provide a valid date."
      );
    }

    where.orderDate = {
      gte: start,
    };
  } else if (endDate) {
    const end = new Date(endDate);

    if (isNaN(end.getTime())) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid end date format. Please provide a valid date."
      );
    }

    where.orderDate = {
      lte: end,
    };
  }
  console.log(where);

  // Fetch main orders with nested orders + products
  const orders = await prisma.mainOrder.findMany({
    where,
    include: {
      orders: {
        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      },
    },
    orderBy: { orderDate: "desc" },
  });

  return orders;
};

/**
 * Get today's MainOrder for a user
 */
const getTodayMainOrder = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  return await prisma.mainOrder.findFirst({
    where: {
      userId,
      orderDate: {
        gte: today,
        lte: endOfDay,
      },
    },
    include: {
      orders: {
        include: {
          products: {
            include: {
              product: true,
            },
          },
          shippingAddress: true,
          branch: true,
        },
      },
    },
  });
};

// const getAllDispatchOrdersByBranchId = async (queryParams: any) => {
//   const { branchId, categoryId, dateTime } = queryParams;

//   //  Handle date
//   let date = dateTime ? new Date(dateTime) : new Date();
//   const startOfDay = new Date(date);
//   startOfDay.setHours(0, 0, 0, 0);
//   const endOfDay = new Date(date);
//   endOfDay.setHours(23, 59, 59, 999);

//   //  Validate branch existence
//   const isBranchExist = await prisma.branch.findUnique({
//     where: { id: branchId },
//   });
//   if (!isBranchExist) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Branch not found");
//   }

//   //  Base condition
//   const where: any = {
//     status: OrderStatus.Pending,
//     orders: {
//       some: {
//         branchId: branchId,
//       },
//     },
//     orderDate: {
//       gte: startOfDay,
//       lte: endOfDay,
//     },
//   };

//   //  Filter by category if provided
//   if (categoryId) {
//     console.log("hit the category");
//     where.orders = {
//       some: {
//         products: {
//           some: {
//             product: {
//               categoryId: categoryId,
//             },
//           },
//         },
//       },
//     };
//   }

//   console.log({ where });

//  // 1️⃣  Fetch all main orders and products
//   const allMainOrders = await prisma.mainOrder.findMany({
//   where,
//   select: {
//     id: true,
//     orders: {
//       select: {
//         products: {
//           select: {
//             id: true,
//             quantity: true,
//             variationId: true,
//             productId: true,
//             product: {
//               select: {
//                 id: true,
//                 name: true,
//                 categoryId: true,
//                 category: {
//                   select: { id: true, name: true },
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   },
// });

// // 2️⃣ Get only the products -
// const allProducts = allMainOrders.flatMap((mainOrder) =>
//   mainOrder.orders.flatMap((order) => order.products)
// );

// // 3️⃣ Get variations for each product
// const productsWithWeights = await Promise.all(
//   allProducts.map(async (item) => {
//     let variationWeight = 0;

//     if (item.variationId) {
//       const variation = await prisma.productVariation.findUnique({
//         where: { id: item.variationId },
//         select: { id: true, weight: true },
//       });

//       variationWeight = variation?.weight || 0;
//     }

//     return {
//       productId: item?.product?.id,
//       productName: item?.product?.name,
//       variationId: item.variationId || null,
//       quantity: item.quantity,
//       variationWeight,
//       totalWeight: item.quantity * variationWeight,
//       categoryId : item?.product?.categoryId || null,
//       categoryName: item?.product?.category?.name || "Unknown",
//     };
//   })
// );

// return productsWithWeights;
// };

interface DispatchQueryParams {
  branchId: string;
  dateTime?: string;
  categoryId?: string;
}

interface ProductMerged {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalWeight: number;
  orders: {
    orderId: string;
    variationId: string | null;
    quantity: number;
    weight: number;
  }[];
  categoryId: string | null;
  categoryName: string;
}

export const getAllDispatchOrdersByBranchId = async (
  queryParams: DispatchQueryParams
) => {
  const { branchId, categoryId, dateTime } = queryParams;

  // 1️⃣ Handle date
  const date = dateTime ? new Date(dateTime) : new Date();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 2️⃣ Validate branch existence
  const isBranchExist = await prisma.branch.findUnique({
    where: { id: branchId },
  });
  if (!isBranchExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Branch not found");
  }

  // 3️⃣ Base condition
  const where: any = {
    OR: [
      { status: OrderStatus.Pending },
      { canceledBy: UserRole.Admin },
      { confirmedBy: UserRole.Admin },
    ],
    orders: {
      some: {
        branchId: branchId,
      },
    },
    orderDate: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };

  // Optional category filter
  if (categoryId) {
    where.orders = {
      some: {
        products: {
          some: {
            product: { categoryId },
          },
        },
      },
    };
  }

  // 4️⃣ Fetch all main orders with products
  const allMainOrders = await prisma.mainOrder.findMany({
    where,
    select: {
      id: true, // mainOrderId (optional)
      orders: {
        select: {
          id: true, // orderId
          products: {
            select: {
              id: true,
              quantity: true,
              variationId: true,
              productId: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  categoryId: true,
                  category: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  // 5️⃣ Flatten all products + keep orderId
  const allProducts = allMainOrders.flatMap((mainOrder) =>
    mainOrder.orders.flatMap((order) =>
      order.products.map((product) => ({
        orderId: order.id,
        productId: product.product?.id,
        productName: product.product?.name,
        variationId: product.variationId || null,
        quantity: product.quantity,
        categoryId: product.product?.categoryId || null,
        categoryName: product.product?.category?.name || "Unknown",
      }))
    )
  );

  // 6️⃣ Batch fetch variations
  const variationIds = allProducts
    .map((p) => p.variationId)
    .filter(Boolean) as string[];

  const variations = await prisma.productVariation.findMany({
    where: { id: { in: variationIds } },
    select: { id: true, weight: true },
  });

  const variationMap = new Map(variations.map((v) => [v.id, v.weight]));

  // 7️⃣ Add weight to each product
  const productsWithWeights = allProducts.map((item) => {
    const weight = item.variationId
      ? variationMap.get(item.variationId) || 0
      : 0;
    return {
      ...item,
      variationWeight: weight,
      totalWeight: item.quantity * weight,
    };
  });

  const mergedByProduct: ProductMerged[] = Object.values(
    productsWithWeights.reduce((acc: any, item) => {
      const key = item.productId || ""; // Merge by productId only

      if (!key || !acc[key]) {
        acc[key] = {
          productId: item.productId,
          productName: item.productName,
          totalQuantity: 0,
          totalWeight: 0,
          totalOrders: 0,
          orders: [], // track all orders + variationId + quantity + weight
          categoryId: item.categoryId,
          categoryName: item.categoryName,
        };
      }

      acc[key].totalQuantity += item.quantity;
      acc[key].totalWeight += item.totalWeight;
      // total main orders not subOrders
      acc[key].totalOrders = allMainOrders.length;
      acc[key].orders.push({
        orderId: item.orderId,
        variationId: item.variationId,
        quantity: item.quantity,
        weight: item.variationWeight,
      });

      return acc;
    }, {})
  );

  //  Return final response
  return mergedByProduct;
};


/// ----------------------- /// Assign orders to delivery Driver -----------------///

const assignOrdersDeliveryToDriver = async (payload : AssignOrdersPayload ) => {
  const { mainOrdersIds, driverId } = payload;

  const isDriverExist = await prisma.user.findFirst({
    where :{
      role : UserRole.Driver,
      id: driverId,
    }
  })
  if(!isDriverExist){
    throw new ApiError(httpStatus.NOT_FOUND, "Driver not found . please send a valid driverId");
  }

  console.log({mainOrdersIds , driverId})
  // Logic to assign orders to the driver

  const result = await prisma.$transaction(async (tx) => {
    await tx.driverAssignment.updateMany({
      where: {
        id: { in: mainOrdersIds },
      },
      data: {
        driverId: driverId,
      },
    });
    await tx.mainOrder.updateMany({
      where :{
        id : { in: mainOrdersIds }
      },
      data :{
        status : MainOrderStatus.onTheway
      }
    })
  })
  return result ;
}

export const orderServices = {
  createOrder,
  placeOrderCOD,
  placeOrderWallet,
  cancelOrder,
  returnOrder,
  getAllOrders,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  deleteOrder,
  // MainOrder methods
  getAllMainOrders,
  getMainOrderById,
  getUserMainOrders,
  getTodayMainOrder,
  getMyCustomerOrders,
  createOrderByAgentForCustomer,
  getAllDispatchOrdersByBranchId,
  assignOrdersDeliveryToDriver
};
