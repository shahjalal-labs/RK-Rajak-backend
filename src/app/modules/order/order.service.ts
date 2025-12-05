import {
  PrismaClient,
  PaymentMethod,
  UserRole,
  OrderStatus,
} from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  AssignOrdersPayload,
  ICancelOrderByCustomerPayload,
  ICreateOrderPayload,
  IOrderAdjustMent,
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
} from "./order.helpers";
import { JwtPayload } from "jsonwebtoken";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToDigitalOceanAWS";

const prisma = new PrismaClient();

/**
 * Place order with COD payment
 * Merges products into daily order with snapshot pricing
 */
const placeOrderCOD = async (payload: ICreateOrderPayload) => {
  const { userId, products, shippingAddressId } = payload;

  // Validate user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.branchId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please set you Location from profile!"
    );
  }

  if (user.isProfileComplete === false) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please complete your profile to place order!"
    );
  }

  // Fetch all products with variations
  const productIds = products.map((p) => p.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      productVariation: true,
      category: true,
    },
  });

  // Validate products and prepare with snapshot pricing
  const validatedProducts: Array<{
    productId: string;
    variationId: string;
    categoryId: string;
    quantity: number;
    product: any;
    variation: any;
    perQuantityPrice: number;
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
    const price = p.quantity * variation.sellingPrice;
    orderTotal += price;

    // Snapshot pricing - capture current price
    validatedProducts.push({
      productId: p.productId,
      categoryId: dbProduct.categoryId,
      variationId: p.variationId,
      quantity: p.quantity,
      product: dbProduct,
      variation: variation,
      perQuantityPrice: variation.sellingPrice,
      snapshotWeightPerUnit: variation.weight,
    });
  }

  // Execute in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Get or create today's DailyOrder
    // need to pass total weight for all products and also totalPrice

    const dailyOrder = await getOrCreateDailyOrder(
      userId,
      shippingAddressId,
      user.branchId!,
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
        p.perQuantityPrice,
        p.snapshotWeightPerUnit,
        tx,
        "COD"
      );
      orderProducts.push(orderProduct);

      // Update daily product aggregation
      const weight = p.quantity * p.snapshotWeightPerUnit;
      const price = p.quantity * p.perQuantityPrice;
      await updateDailyProductAggregation(
        p.productId,
        dailyOrder.id,
        weight,
        price,
        "add",
        tx,
        p.categoryId,
        user.branchId!
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
  const { userId, products, shippingAddressId } = payload;

  // Validate user and wallet
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Wallet: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.branchId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please set you Location from profile!"
    );
  }

  if (user.isProfileComplete === false) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please complete your profile to place order!"
    );
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
      category: true,
    },
  });

  // Validate and calculate total
  const validatedProducts: Array<{
    productId: string;
    variationId: string;
    categoryId: string;
    quantity: number;
    product: any;
    variation: any;
    perQuantityPrice: number;
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
    const price = p.quantity * variation.sellingPrice;
    orderTotal += price;

    validatedProducts.push({
      productId: p.productId,
      categoryId: dbProduct.categoryId,
      variationId: p.variationId,
      quantity: p.quantity,
      product: dbProduct,
      variation: variation,
      perQuantityPrice: variation.sellingPrice,
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
      user.branchId!,
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
        p.perQuantityPrice,
        p.snapshotWeightPerUnit,
        tx,
        "Wallet"
      );

      // Update aggregation
      const weight = p.quantity * p.snapshotWeightPerUnit;
      const price = p.quantity * p.perQuantityPrice;
      await updateDailyProductAggregation(
        p.productId,
        dailyOrder.id,
        weight,
        price,
        "add",
        tx,
        p.categoryId,
        user.branchId!
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
    select: {
      id: true,
      userId: true,
      totalAmount: true,
      totalWeight: true,
      totalAcceptedWeight: true,
      totalRejectedWeight: true,
      totalReturnedWeight: true,
      totalAcceptedPrice: true,
      totalRejectedPrice: true,
      totalReturnedPrice: true,
      paymentMethod: true,
      walletAmountUsed: true,
      RemainingAmount: true,
      status: true,
      cancellationReason: true,
      DeliveryProof: true,
      shippingAddressId: true,
      orderDate: true,
      branchId: true,
      isDues: true,
      duesCleared: true,
      duesClearedAt: true,
      createdAt: true,
      updatedAt: true,
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
    where: where ? where : {},
    select: {
      id: true,
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
      totalAmount: true,
      walletAmountUsed: true,
      totalWeight: true,
      totalAcceptedWeight: true,
      totalAcceptedPrice: true,
      totalRejectedWeight: true,
      totalRejectedPrice: true,
      totalReturnedWeight: true,
      totalReturnedPrice: true,
      RemainingAmount: true,
      orderDate: true,
      status: true,
      shippingAddress: {
        select: {
          shopName: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Get daily product summary
 */
const getDailyDispatch = async (queryParams?: any) => {
  const { dateString, branchId, productCategoryId } = queryParams || {};
  return await getDailyProductSummary(dateString, branchId, productCategoryId);
};
/**

 * Accept order product (Admin)
 */
const acceptProduct = async (totalorderProductId: string) => {
  return await acceptOrderProduct(totalorderProductId);
};

/**
 * Reject order product (Admin)
 */

const rejectProductByAdmin = async (totalorderProductId: string) => {
  return await rejectOrderProduct(totalorderProductId);
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

const getBranchDayWiseCalculations = async (
  branchId: string,
  queryParams?: any
) => {
  // Implement the logic to get branch day-wise calculations
  const date = queryParams?.dateString || getDateString();

  // total orders of the day
  const orderOfTheDay = await prisma.dailyOrder.count({
    where: {
      branchId: branchId,
      orderDate: date,
    },
  });
  // total order product of the day
  const orderProductsOfTheDay = await prisma.totalProductOrder.count({
    where: {
      branchId: branchId,
      createdAt: {
        gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
      },
    },
  });
  // total revenue of the day
  const revenueOfTheDayAgg = await prisma.dailyOrder.aggregate({
    where: {
      branchId: branchId,
      orderDate: date,
    },
    _sum: {
      totalAmount: true,
    },
  });

  // total return products of the day
  // totalProductOrder
  const returnProductsOfTheDay = await prisma.totalProductOrder.aggregate({
    where: {
      branchId: branchId,
      orderDateString: date,
      status: "Returned",
    },
    _count: {
      _all: true,
    },
    _sum: {
      returnedWeight: true,
      returnedPrice: true,
    },
  });

  return {
    totalOrders: orderOfTheDay,
    totalOrderProducts: orderProductsOfTheDay,
    totalRevenue: revenueOfTheDayAgg._sum.totalAmount || 0,
    totalReturnedWeight: returnProductsOfTheDay._sum.returnedWeight || 0, // KG
    totalReturnedPrice: returnProductsOfTheDay._sum.returnedPrice || 0,
  };

  // This is a placeholder implementation
};

/// ----------------------- /// Assign orders to delivery Driver -----------------///

const assignOrdersDeliveryToDriver = async (payload: AssignOrdersPayload) => {
  const { ordersIds, driverId } = payload;

  const isDriverExist = await prisma.user.findFirst({
    where: {
      role: UserRole.Driver,
      id: driverId,
    },
  });
  if (!isDriverExist) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Driver not found . please send a valid driverId"
    );
  }

  console.log({ ordersIds, driverId });

  // Validate main orders existence and also is already assigned or not
  // Fetch all orders in one query
  const existingOrders = await prisma.dailyOrder.findMany({
    where: { id: { in: ordersIds } },
    include: { driverAssignments: true, OrderProducts: true },
  });

  // if some orders are not found
  if (existingOrders.length !== ordersIds.length) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Some provided order IDs do not exist"
    );
  }

  // check if any order is already assigned and also return the name which one is already assigned
  const alreadyAssigned = existingOrders.filter(
    (order) => order.driverAssignments && order.driverAssignments.length > 0
  );

  if (alreadyAssigned.length > 0) {
    const assignedIds = alreadyAssigned.map((o) => o.id).join(", ");
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `These orders are already assigned to driver: ${assignedIds}`
    );
  }

  // check is this order any product is pending  // if still some of product pending then do not allow to assign!
  const pendingOrders = existingOrders.filter(
    (order) => order.status === OrderStatus.Pending
  );
  if (pendingOrders.length > 0) {
    const pendingIds = pendingOrders
      .map((o) => o.OrderProducts.map((op) => op.id))
      .join(", ");
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `There are pending products in these orders: ${pendingIds}`
    );
  }
  // check is this order cancelled or delivered
  const invalidStatusOrders = existingOrders.filter((order) => {
    return (
      order.status === OrderStatus.Cancelled ||
      order.status === OrderStatus.Delivered
    );
  });
  if (invalidStatusOrders.length > 0) {
    const invalidStatusIds = invalidStatusOrders.map((o) => o.id).join(", ");
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `These orders are either Cancelled or Delivered : ${invalidStatusIds}`
    );
  }

  // Logic to assign orders to the driver
  await prisma.$transaction(async (tx) => {
    const updatedAssignments = await tx.driverAssignment.createMany({
      data: ordersIds.map((orderId) => ({
        dailyOrderId: orderId,
        driverId,
      })),
    });

    const updatedMainOrders = await tx.dailyOrder.updateMany({
      where: { id: { in: ordersIds } },
      data: { status: OrderStatus.OnTheWay },
    });

    return { updatedAssignments, updatedMainOrders };
  });

  return;
};

const getMyAssignedOrders = async (user: JwtPayload, queryParams: any) => {
  const driverId = user.id;
  const { date } = queryParams;

  // Use today's date if no date provided
  // If date is provided as "YYYY-MM-DD", convert it to a proper Date object
  let targetDate: Date;
  if (date) {
    // Parse YYYY-MM-DD format
    const parsedDate = new Date(date);
    targetDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  } else {
    targetDate = new Date();
  }

  let where: any = {
    driverId,
    assignedAt: {
      gte: new Date(targetDate.setHours(0, 0, 0, 0)),
      lte: new Date(targetDate.setHours(23, 59, 59, 999)),
    },
  };
  // queryParams.status === "Active" ? send all onTheWay
  // queryParams.status === "Cancelled" ? send all cancelled
  // queryParams.status === "delivered" ? send all delivered

  if (queryParams.status) {
    if (queryParams.status === "Active") {
      where = {
        ...where,
        dailyOrder: {
          status: OrderStatus.OnTheWay,
        },
      };
    } else if (queryParams.status === "Cancelled") {
      where = {
        ...where,
        dailyOrder: {
          status: OrderStatus.Cancelled,
        },
      };
    } else if (queryParams.status === "Delivered") {
      where = {
        ...where,
        dailyOrder: {
          status: OrderStatus.Delivered,
        },
      };
    }
  }
  const driverOrders = await prisma.driverAssignment.findMany({
    where,
    select: {
      id: true,
      deliveryDate: true,
      assignedAt: true,
      createdAt: true,
      dailyOrderId: true,
      dailyOrder: {
        select: {
          id: true,
          orderDate: true,
          totalAmount: true,
          status: true,
          totalWeight: true,
          totalAcceptedWeight: true,
          totalAcceptedPrice: true,
          totalRejectedWeight: true,
          totalRejectedPrice: true,
          totalReturnedWeight: true,
          totalReturnedPrice: true,
          RemainingAmount: true,
          shippingAddress: {
            select: {
              id: true,
              shopName: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  return driverOrders;
};

const getTotalAssignedOrderProducts = async (driverId: string) => {
  // 1️ Get today's start and end times
  const today = getDateString();
  const startOfDay = new Date(new Date(today).setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date(today).setHours(23, 59, 59, 999));

  // 2 Get all assigned orders of the driver for today
  const assignedOrders = await prisma.driverAssignment.findMany({
    where: {
      driverId,
      dailyOrder: {
        status: { equals: OrderStatus.OnTheWay },
      },
      assignedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (assignedOrders.length === 0) {
    return {
      totalAssignedProducts: [],
      totalUniqueProducts: 0,
    };
  }

  const orderIds = assignedOrders.map((o) => o.dailyOrderId);

  // 3 Group products by productId from those order products
  const groupedProducts = await prisma.orderProduct.groupBy({
    by: ["productId"],
    where: {
      orderId: { in: orderIds },
    },
    _sum: {
      acceptedWeight: true,
      acceptedPrice: true,
    },
    _count: {
      orderId: true,
    },
  });

  // 4️ Fetch product details for each productId
  const productIds = groupedProducts.map((gp) => gp.productId);

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds as string[] },
    },
    select: {
      id: true,
      name: true,
      images: true,
    },
  });

  // Create a lookup map
  const productMap = new Map(products.map((p) => [p.id, p]));

  // 5️ Build final result array
  // Implemenet - whose are accepted must be getter then 0
  const finalResult = groupedProducts
    .filter((gp) => (gp._sum.acceptedWeight || 0) > 0)
    .map((gp) => {
      const product = productMap.get(gp.productId!);

      return {
        productId: gp.productId,
        productName: product?.name || "",
        productImage:
          product?.images && product.images.length > 0
            ? product.images[0]
            : null,
        totalDeliveryWeight: gp._sum.acceptedWeight || 0,
        totalPrice: gp._sum.acceptedPrice || 0,
        orderCount: gp._count.orderId,
      };
    });

  return {
    totalAssignedProducts: finalResult,
    totalUniqueProducts: finalResult.length,
  };
};
const getTotalAssignedReturnedProducts = async (driverId: string) => {
  // 1️ Get today's start and end times
  const today = getDateString();
  const startOfDay = new Date(new Date(today).setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date(today).setHours(23, 59, 59, 999));

  // 2 Get all assigned orders of the driver for today
  const assignedOrders = await prisma.driverAssignment.findMany({
    where: {
      driverId,
      assignedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (assignedOrders.length === 0) {
    return {
      totalAssignedProducts: [],
      totalUniqueProducts: 0,
    };
  }

  const orderIds = assignedOrders.map((o) => o.dailyOrderId);

  // 3 Group products by productId from those order products
  const groupedProducts = await prisma.orderProduct.groupBy({
    by: ["productId"],
    where: {
      orderId: { in: orderIds },
    },
    _sum: {
      returnedWeight: true,
      returnedPrice: true,
    },
    _count: {
      orderId: true,
    },
  });

  // 4️ Fetch product details for each productId
  const productIds = groupedProducts.map((gp) => gp.productId);

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds as string[] },
    },
    select: {
      id: true,
      name: true,
      images: true,
    },
  });

  // Create a lookup map
  const productMap = new Map(products.map((p) => [p.id, p]));

  // 5️ Build final result array

  // Add On - If rturn weigth is 0 then do not include in the final result
  const filteredGroupedProducts = groupedProducts.filter(
    (gp) => (gp._sum.returnedWeight || 0) > 0
  );
  const finalResult = filteredGroupedProducts.map((gp) => {
    const product = productMap.get(gp.productId!);

    return {
      productId: gp.productId,
      productName: product?.name || "",
      productImage:
        product?.images && product.images.length > 0 ? product.images[0] : null,
      totalReturnedWeight: gp._sum.returnedWeight || 0,
      totalReturnedPrice: gp._sum.returnedPrice || 0,
      orderCount: gp._count.orderId,
    };
  });

  return {
    totalReturnedProducts: finalResult,
    totalUniqueProducts: finalResult.length,
  };
};

const getOrderDetailsForDriver = async (orderId: string, driverId: string) => {
  // first validate is this order assigned to this driver
  const assignment = await prisma.driverAssignment.findFirst({
    where: {
      dailyOrderId: orderId,
      driverId: driverId,
    },
  });
  if (!assignment) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not assigned to this order"
    );
  }
  const order = await prisma.dailyOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      totalAmount: true,
      totalWeight: true,
      totalAcceptedWeight: true,
      totalRejectedWeight: true,
      totalReturnedWeight: true,
      totalAcceptedPrice: true,
      totalRejectedPrice: true,
      totalReturnedPrice: true,
      status: true,
      orderDate: true,
      paymentMethod: true,
      walletAmountUsed: true,
      RemainingAmount: true,
      DeliveryProof: true,
      OrderProducts: {
        where: {
          status: {
            not: "Cancelled",
          },
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
      },
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          agentId: true,
          buyerRating: true,
          profileImage: true,
        },
      },
      shippingAddress: {
        select: {
          shopName: true,
          address: true,
          landmark: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

type PaymentEntry = {
  method: "Cash" | "Wallet" | "Credit" | "QrCode" | "Pre_Paid";
  amount: number;
};

type MarkOrderAsDeliveredPayload = {
  payments: PaymentEntry[];
};

const markOrderAsDelivered = async (
  orderId: string,
  driverId: string,
  payload: MarkOrderAsDeliveredPayload,
  deliveryProof?: Express.Multer.File
) => {
  // Validate assignment
  const deliveryDate = new Date();
  const assignment = await prisma.driverAssignment.findFirst({
    where: {
      dailyOrderId: orderId,
      driverId: driverId,
    },
  });

  if (!assignment) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not assigned to this order"
    );
  }

  // Validation: at least 1 payment required
  if (!payload.payments || payload.payments.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one payment method is required"
    );
  }

  const totalPaid = payload.payments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  // Priority logic
  const hasCredit = payload.payments.some((p) => p.method === "Credit");
  const hasWallet = payload.payments.some((p) => p.method === "Wallet");

  let primaryMethod: PaymentMethod;

  if (hasCredit) {
    primaryMethod = "Credit";
  } else if (hasWallet) {
    primaryMethod = "Wallet"; // or "Wallet"
  } else {
    primaryMethod = payload.payments[0].method as PaymentMethod;
  }

  let deliveryProofUrl: string | undefined = undefined;

  if (deliveryProof) {
    deliveryProofUrl = (await uploadToDigitalOceanAWS(deliveryProof)).Location;
  }

  // Single DB update
  await prisma.dailyOrder.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.Delivered,
      paymentMethod: primaryMethod,
      RemainingAmount: { decrement: totalPaid },
      DeliveryProof: deliveryProofUrl,
    },
  });

  //!TODO: Handle payment history logging if needed
  /*
  //** Check still remaing exist or not! if Exist then change the isDues : true with paymentMethod : "credit"*/
  const order = await prisma.dailyOrder.findUnique({
    where: { id: orderId },
  });
  if (order && order.RemainingAmount > 0) {
    await prisma.dailyOrder.update({
      where: { id: orderId },
      data: {
        isDues: true,
        paymentMethod: "Credit",
      },
    });
  }
  await prisma.driverAssignment.update({
    where: { id: assignment.id },
    data: {
      deliveryDate: deliveryDate,
    },
  });
};

const cancelOrderByCustomer = async (
  payload: ICancelOrderByCustomerPayload
) => {
  //! TODO : Refund After cancellation if paid by wallet
  let refundAmount: number = 0;
  let totalPrice: number = 0;
  let decressRemaining: number = 0;

  const { orderId, productId, reason } = payload;

  // =================== FETCH ORDER ===================
  const order = await prisma.dailyOrder.findUnique({
    where: { id: orderId },
    include: { OrderProducts: true, user: { include: { Wallet: true } } },
  });

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found");

  // =====================================================================================
  //   CASE 1: FULL ORDER CANCEL (ONLY orderId PROVIDED)
  // =====================================================================================

  // check is Already delivered or cancelled
  if (
    order.status === "Delivered" ||
    order.status === "Returned" ||
    order.status === "Cancelled"
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Order is already ${order.status.toLowerCase()}`
    );
  }

  if (!productId) {
    await prisma.$transaction(async (tx) => {
      // Cancel main order
      await tx.dailyOrder.update({
        where: { id: orderId },
        data: {
          status: "Returned",
          cancellationReason: reason ?? "Cancelled by Customer",
          totalReturnedWeight: order.totalAcceptedWeight,
          totalReturnedPrice: order.totalAcceptedPrice,
          RemainingAmount: 0,
        },
      });

      // Cancel all products
      for (const op of order.OrderProducts) {
        await tx.orderProduct.update({
          where: { id: op.id },
          data: {
            status: "Returned",
            returnedWeight: op.acceptedWeight,
            returnedPrice: op.acceptedPrice,
            acceptedWeight: 0,
            acceptedPrice: 0,
            returnedQuantity: op.acceptedQuantity,
          },
        });

        // Daily aggregation update
        await updateDailyProductAggregation(
          op.productId!,
          orderId,
          op.acceptedWeight!,
          op.acceptedPrice!,
          "return",
          tx,
          "",
          order.branchId!
        );
      }

      // refund logic if paid by wallet
      if (order.walletAmountUsed! > 0 && order.user?.Wallet) {
        await tx.wallet.update({
          where: { id: order.user.Wallet.id },
          data: { balance: { increment: order.walletAmountUsed || 0 } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: order.user.Wallet.id,
            amount: order.walletAmountUsed || 0,
            type: "Credit",
            description: "Refund for returned order (Admin rejected)",
            status: "Success",
          },
        });
      }
    });
    return { message: "Full order cancelled successfully" };
  }

  // =====================================================================================
  //   CASE 2: FULL PRODUCT CANCEL (orderId + productId)
  // =====================================================================================

  const orderProduct = order.OrderProducts.find(
    (op) => op.productId === productId
  );

  if (!orderProduct) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Product ${productId} not found in this order`
    );
  }
  // Find the specific product in the order and is already returned or Confirmed or rejected

  if (
    orderProduct.status === "Cancelled" ||
    orderProduct.status === "Returned"
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Product ${productId} is already ${orderProduct.status.toLowerCase()}`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Full cancel product
    await tx.orderProduct.update({
      where: { id: orderProduct.id },
      data: {
        status: "Returned",
        returnedWeight: orderProduct.acceptedWeight,
        returnedPrice: orderProduct.acceptedPrice,
        returnedQuantity: orderProduct.acceptedQuantity,
      },
    });

    // Update aggregation
    await updateDailyProductAggregation(
      orderProduct.productId!,
      orderId,
      orderProduct.acceptedWeight!,
      orderProduct.acceptedPrice!,
      "return",
      tx,
      "",
      order.branchId!
    );

    // refund logic if paid by wallet
    const productRefundAmount = orderProduct.totalWalletAmountUsed || 0;
    const decressRemainingAmount =
      orderProduct.acceptedPrice! - productRefundAmount;
    if (productRefundAmount > 0 && order.user?.Wallet) {
      await tx.wallet.update({
        where: { id: order.user.Wallet.id },
        data: { balance: { increment: productRefundAmount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: order.user.Wallet.id,
          amount: productRefundAmount,
          type: "Credit",
          description: `Refund for returned product ${orderProduct.productId} (Admin rejected)`,
          status: "Success",
        },
      });
    }

    // Optional reason
    await tx.dailyOrder.update({
      where: { id: orderId },
      data: {
        status: "PartialReturned",
        cancellationReason: reason ?? "Cancelled by Customer",
        totalReturnedWeight: { increment: orderProduct.acceptedWeight! },
        totalReturnedPrice: { increment: orderProduct.acceptedPrice! },
        RemainingAmount: { decrement: decressRemainingAmount },
      },
    });
  });

  // DONE : Check if all products are returned then update main order status to returned
  const updatedOrder = await prisma.dailyOrder.findUnique({
    where: { id: orderId },
    include: { OrderProducts: true },
  });
  const allReturned = updatedOrder?.OrderProducts.every(
    (op) => op.status === "Returned" || op.status === "Cancelled"
  );

  if (allReturned) {
    await prisma.dailyOrder.update({
      where: { id: orderId },
      data: { status: "Returned" },
    });
  }

  return { message: "Product cancelled successfully" };
};

const returnOrderProduct = async (orderProductId: string, payload: IOrderAdjustMent) => {
  const {returnWeight, returnPrice } = payload;

  // 1) Fetch orderProduct with order and user wallet
  const orderProduct = await prisma.orderProduct.findUnique({
    where: { id: orderProductId },
    include: {
      order: {
        include: {
          user: { include: { Wallet: true } },
          OrderProducts: true, // later we'll need to check all products
        },
      },
    },
  });

  if (!orderProduct) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order product not found");
  }

  // 2) Validation
  const maxReturnableWeight =
    (orderProduct.acceptedWeight || 0) - (orderProduct.returnedWeight || 0);
  if (returnWeight > maxReturnableWeight) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Return weight exceeds maximum returnable weight of ${maxReturnableWeight} kg`
    );
  }

  const maxReturnablePrice =
    (orderProduct.acceptedPrice || 0) - (orderProduct.returnedPrice || 0);
  if (returnPrice > maxReturnablePrice) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Return price exceeds maximum returnable price of ${maxReturnablePrice}`
    );
  }

  // helper for rounding (2 decimal places)
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  await prisma.$transaction(async (tx) => {
    // CURRENT numeric values
    const prevAcceptedWeight = orderProduct.acceptedWeight || 0;
    const prevAcceptedPrice = orderProduct.acceptedPrice || 0;
    const prevReturnedWeight = orderProduct.returnedWeight || 0;
    const prevReturnedPrice = orderProduct.returnedPrice || 0;

    // 3) New accepted / returned values after this return
    const newReturnedWeight = round2(prevReturnedWeight + returnWeight);
    const newReturnedPrice = round2(prevReturnedPrice + returnPrice);

    const newAcceptedWeight = round2(prevAcceptedWeight - returnWeight);
    const newAcceptedPrice = round2(prevAcceptedPrice - returnPrice);

    // 4) Wallet refund: pro-rata based on acceptedPrice portion
    const walletAmountUsedForProduct = orderProduct.totalWalletAmountUsed || 0;
    // if acceptedPrice was zero, avoid divide by zero
    const refundAmount =
      prevAcceptedPrice > 0
        ? round2((walletAmountUsedForProduct * returnPrice) / prevAcceptedPrice)
        : 0;

    // 5) Update orderProduct fields
    // - increment returnedWeight/Price
    // - decrement acceptedWeight/Price
    // - optionally update returnedQuantity/acceptedQuantity if you track quantity (left as is currently)
    // - set status based on whether fully returned
    const productStatus =
      newAcceptedWeight === 0 && newAcceptedPrice === 0 ? "Returned" : "PartialReturned";

    await tx.orderProduct.update({
      where: { id: orderProductId },
      data: {
        returnedWeight: { set: newReturnedWeight },
        returnedPrice: { set: newReturnedPrice },
        acceptedWeight: { set: newAcceptedWeight },
        acceptedPrice: { set: newAcceptedPrice },
        status: productStatus,
        // if you want, update returnedQuantity/acceptedQuantity here
        // returnedQuantity: { increment: <...> },
        // acceptedQuantity: { decrement: <...> },
      },
    });

    // 6) Update daily aggregation for the returned amount
    await updateDailyProductAggregation(
      orderProduct.productId!,
      orderProduct.orderId!,
      returnWeight,
      returnPrice,
      "return",
      tx,
      "",
      orderProduct?.order?.branchId!
    );

    // 7) Wallet refund transaction (if any)
    if (refundAmount > 0 && orderProduct.order?.user?.Wallet) {
      // increment wallet balance
      await tx.wallet.update({
        where: { id: orderProduct.order.user.Wallet.id },
        data: { balance: { increment: refundAmount } },
      });

      // create wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: orderProduct.order.user.Wallet.id,
          amount: refundAmount,
          type: "Credit",
          description: `Refund for returned product ${orderProduct.productId} (by admin)`,
          status: "Success",
        },
      });
    }

    // 8) Update main order totals: totalReturnedWeight/Price increment, totalAcceptedWeight/Price decrement
    // Also adjust RemainingAmount: decrease by (returnPrice - refundAmount)
    const remainingDecrement = round2(Math.max(0, returnPrice - refundAmount));

    // Ensure RemainingAmount not become negative
    const orderRow = await tx.dailyOrder.findUnique({
      where: { id: orderProduct.orderId! },
      select: { RemainingAmount: true, totalAcceptedPrice: true, totalAcceptedWeight: true },
    });

    const prevRemaining = orderRow?.RemainingAmount || 0;
    const newRemaining = round2(Math.max(0, prevRemaining - remainingDecrement));

    await tx.dailyOrder.update({
      where: { id: orderProduct.orderId! },
      data: {
        totalReturnedWeight: { increment: returnWeight },
        totalReturnedPrice: { increment: returnPrice },
        // optionally decrement totalAcceptedWeight/Price if you track those
        totalAcceptedWeight: orderRow?.totalAcceptedWeight !== undefined ? { decrement: returnWeight } : undefined,
        totalAcceptedPrice: orderRow?.totalAcceptedPrice !== undefined ? { decrement: returnPrice } : undefined,
        RemainingAmount: { set: newRemaining },
        status: "PartialReturned", // we'll finalize status check after transaction
      },
    });
  }); // end transaction

  // 9) AFTER transaction: check if all products are returned to set main order status to Returned
  // Fetch updated order products to decide
  const updatedOrder = await prisma.dailyOrder.findUnique({
    where: { id: orderProduct.orderId! },
    include: { OrderProducts: true },
  });

  if (!updatedOrder) {
    // this is unlikely, but handle defensively
    return { message: "Product returned and order updated" };
  }

  const allReturned = updatedOrder.OrderProducts.every(
    (op) => op.status === "Returned" || op.status === "Cancelled"
  );

  if (allReturned) {
    await prisma.dailyOrder.update({
      where: { id: orderProduct.orderId! },
      data: { status: "Returned" },
    });
  } else {
    // ensure PartialReturned is set if not all returned
    await prisma.dailyOrder.update({
      where: { id: orderProduct.orderId! },
      data: { status: "PartialReturned" },
    });
  }

  return { message: "Product return processed successfully" };
};

export const orderServices = {
  createOrder,
  returnOrderProduct,
  placeOrderCOD,
  placeOrderWallet,
  getUserDailyOrders,
  getTodayOrder,
  getAllDailyOrders,
  getDailyDispatch,
  acceptProduct,
  rejectProductByAdmin,
  adjustProductQuantity,
  getOrderById,
  getBranchDayWiseCalculations,
  getMyAssignedOrders,
  assignOrdersDeliveryToDriver,
  getTotalAssignedOrderProducts,
  getTotalAssignedReturnedProducts,
  getOrderDetailsForDriver,
  markOrderAsDelivered,
  cancelOrderByCustomer,
};
