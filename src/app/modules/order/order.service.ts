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
  ICreateOrderPayloadByAgentForCustomer,
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
  adjustOrderProduct,
  getDailyProductSummary,
} from "./order.helpers";
import { JwtPayload } from "jsonwebtoken";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToDigitalOceanAWS";
import {
  updateDriverProgressOnDelivery,
  updateDriverProgressOnAssignment,
  updateAgentProgress,
} from "../incentives/incentives.helper";
import { sendSingleNotification } from "../notifications/notification.services";

const prisma = new PrismaClient();

/**
 * Place order with COD payment
 * Merges products into daily order with snapshot pricing
 */
const placeOrderCOD = async (payload: ICreateOrderPayload) => {
  const {
    userId,
    products,
    shippingAddressId,
    handlingCharge = 0,
    note = "",
  } = payload;

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
    perQuantitySellingPrice: number;
    perQuantityRealPrice: number;
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
      perQuantitySellingPrice: variation.sellingPrice,
      perQuantityRealPrice: variation.realPrice,
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
        p.perQuantitySellingPrice,
        p.perQuantityRealPrice,
        p.snapshotWeightPerUnit,
        tx,
        "COD"
      );
      orderProducts.push(orderProduct);

      // Update daily product aggregation
      const weight = p.quantity * p.snapshotWeightPerUnit;
      const price = p.quantity * p.perQuantitySellingPrice;
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
    await recalculateDailyOrderTotal(
      dailyOrder.id,
      tx,
      0,
      handlingCharge,
      note
    );

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

  // Send notification to customer
  try {
    if (result) {
      await sendSingleNotification(
        userId,
        `Your order has been placed successfully! Total amount: ₹${result.totalAmount}. We'll notify you once it's confirmed.`,
        undefined,
        "Order Placed"
      );
    }
  } catch (error) {
    console.error("Failed to send order placed notification:", error);
  }

  return result;
};

/**
 * Place order with Wallet payment
 */
const placeOrderWallet = async (payload: ICreateOrderPayload) => {
  const {
    userId,
    products,
    shippingAddressId,
    handlingCharge = 0,
    note = "",
  } = payload;

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
    perQuantitySellingPrice: number;
    perQuantityRealPrice: number;
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

    const price = p.quantity * variation.sellingPrice;
    orderTotal += price;

    validatedProducts.push({
      productId: p.productId,
      categoryId: dbProduct.categoryId,
      variationId: p.variationId,
      quantity: p.quantity,
      product: dbProduct,
      variation: variation,
      perQuantitySellingPrice: variation.sellingPrice,
      perQuantityRealPrice: variation.realPrice,
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
        p.perQuantitySellingPrice,
        p.perQuantityRealPrice,
        p.snapshotWeightPerUnit,
        tx,
        "Wallet"
      );

      // Update aggregation
      const weight = p.quantity * p.snapshotWeightPerUnit;
      const price = p.quantity * p.perQuantitySellingPrice;
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
    await recalculateDailyOrderTotal(
      dailyOrder.id,
      tx,
      0,
      handlingCharge,
      note
    );

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
  // check if is they have 3 dues then throw error and do not allow to place order
  const userDuesCount = await prisma.dailyOrder.count({
    where: {
      isDues: true,
      RemainingAmount: {
        gt: 0,
      },
      userId: payload.userId,
    },
  });

  if (userDuesCount >= 3) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You have 3 pending dues. Please clear your dues to place new orders."
    );
  }

  switch (payload.paymentMethod) {
    case "COD":
      return await placeOrderCOD(payload);
    case "Wallet":
      return await placeOrderWallet(payload);
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid payment method");
  }
};

//** BULK ORDER BY AGNET FOR HIS OWN ASSIGNED CUSTOMERS */

const createOrderByAgentForCustomer = async (
  payload: ICreateOrderPayloadByAgentForCustomer
) => {
  const {
    userId: agentId,
    customerId,
    products,
    shippingAddressId,
    paymentMethod,
    handlingCharge = 0,
    note = "",
  } = payload;

  // ================= VALIDATIONS =================
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
  });
  if (!customer) throw new ApiError(404, "Customer not found");

  if (customer.agentId !== agentId) {
    throw new ApiError(403, "This customer does not belong to you");
  }

  const shipping = await prisma.shippingAddress.findUnique({
    where: { id: shippingAddressId },
  });
  if (!shipping || shipping.userId !== customerId) {
    throw new ApiError(400, "Invalid shipping address");
  }

  // ============== Fetch products for validation ==============
  const productIds = products.map((p) => p.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      productVariation: true,
      category: true,
    },
  });

  // ============== Validate products and prepare with agent-provided pricing =======================
  const validatedProducts: Array<{
    productId: string;
    variationId: string;
    categoryId: string;
    quantity: number;
    product: any;
    variation: any;
    perQuantitySellingPrice: number;
    perQuantityRealPrice: number; // Agent-provided price per quantity
    snapshotWeightPerUnit: number;
  }> = [];

  for (const p of products) {
    const dbProduct = dbProducts.find((prod) => prod.id === p.productId);
    if (!dbProduct) {
      throw new ApiError(404, `Product not found: ${p.productId}`);
    }

    const variation = dbProduct.productVariation.find(
      (v) => v.id === p.variationId
    );

    if (!variation) {
      throw new ApiError(
        404,
        `Variation not found for product: ${dbProduct.name}`
      );
    }

    if (variation.availableQuantity < p.quantity) {
      throw new ApiError(400, `Insufficient quantity for ${dbProduct.name}`);
    }

    // Use agent-provided price per quantity instead of product's selling price
    const perQuantityPrice = p.price / p.quantity;

    validatedProducts.push({
      productId: p.productId,
      categoryId: dbProduct.categoryId,
      variationId: p.variationId,
      quantity: p.quantity,
      product: dbProduct,
      variation: variation,
      perQuantitySellingPrice: perQuantityPrice, // Agent-provided price
      perQuantityRealPrice: variation.realPrice,
      snapshotWeightPerUnit: variation.weight,
    });
  }

  // ================= TRANSACTION (Same pattern as placeOrderCOD) =================
  const result = await prisma.$transaction(async (tx) => {
    // Get or create today's DailyOrder for the customer
    const dailyOrder = await getOrCreateDailyOrder(
      customerId,
      shippingAddressId,
      customer.branchId!,
      paymentMethod,
      tx
    );

    // Merge or create OrderProducts with agent-provided pricing
    const orderProducts = [];
    for (const p of validatedProducts) {
      const orderProduct = await mergeOrCreateOrderProduct(
        dailyOrder.id,
        p.productId,
        p.variationId,
        p.quantity,
        p.perQuantitySellingPrice, // Agent-provided price
        p.perQuantityRealPrice,
        p.snapshotWeightPerUnit,
        tx,
        paymentMethod === PaymentMethod.COD ? "COD" : "Wallet"
      );
      orderProducts.push(orderProduct);

      // Update daily product aggregation
      const weight = p.quantity * p.snapshotWeightPerUnit;
      const price = p.quantity * p.perQuantitySellingPrice; // Agent-provided total price
      await updateDailyProductAggregation(
        p.productId,
        dailyOrder.id,
        weight,
        price,
        "add",
        tx,
        p.categoryId,
        customer.branchId!
      );
    }

    // Recalculate total
    await recalculateDailyOrderTotal(
      dailyOrder.id,
      tx,
      0,
      handlingCharge,
      note
    );

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
      handlingCharge: true,
      note: true,
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
      handlingCharge: true,
      note: true,
      paymentMethod: true,
      createdAt: true,
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
  const { dateString, branchId, productCategoryId , packageType } = queryParams || {};
  return await getDailyProductSummary(dateString, branchId, productCategoryId, packageType);
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
  newWeight: number
) => {
  return await adjustOrderProduct(orderProductId, newWeight);
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

const getMyCustomerOrders = async (userId: string, queryParams: any) => {
  const { startDate, endDate } = queryParams;

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
    return [];
  }

  const where: any = {
    userId: { in: customerIds },
  };

  // Apply date filters
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // end date midnight handling
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid date format. Please provide valid dates."
      );
    }

    // since orderDate is STRING in DB → use ISO string
    where.orderDate = {
      gte: start.toISOString(),
      lte: end.toISOString(),
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
      gte: start.toISOString(),
    };
  } else if (endDate) {
    const end = new Date(endDate);

    if (isNaN(end.getTime())) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Invalid end date format. Please provide a valid date."
      );
    }

    end.setHours(23, 59, 59, 999);

    where.orderDate = {
      lte: end.toISOString(),
    };
  }

  // Fetch main orders with nested orders + products
  const orders = await prisma.dailyOrder.findMany({
    where,
    include: {
      OrderProducts: true,
      user: true,
    },
    orderBy: { orderDate: "desc" },
  });

  return orders;
};

const getBranchDayWiseCalculations = async (
  user: JwtPayload,
  queryParams?: any
) => {
  const { startDate, endDate, type, branchId } = queryParams || {};
  // Implement the logic to get branch day-wise calculations

  const startDateString = startDate || getDateString();
  const endDateString = endDate || getDateString();

  // Create proper Date objects for createdAt filtering
  const startDateTime = new Date(startDateString);
  const endDateTime = new Date(endDateString);

  // Validate dates
  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid date format. Please provide valid dates."
    );
  }

  // Set hours for start and end of day
  startDateTime.setHours(0, 0, 0, 0);
  endDateTime.setHours(23, 59, 59, 999);
  //overview || summary
  if (type === "overview") {
    // total orders of the day
    const orderOfTheDay = await prisma.dailyOrder.count({
      where: {
        branchId: branchId ?? undefined,
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
      },
    });
    // total order product of the day
    const orderProductsOfTheDay = await prisma.totalProductOrder.count({
      where: {
        branchId: branchId ?? undefined,
        createdAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
    });
    // total revenue of the day
    const revenueOfTheDayAgg = await prisma.dailyOrder.aggregate({
      where: {
        branchId: branchId ?? undefined,
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    // total return products of the day
    // totalProductOrder
    const returnProductsOfTheDay = await prisma.totalProductOrder.aggregate({
      where: {
        branchId: branchId ?? undefined,
        orderDateString: {
          gte: startDateString,
          lte: endDateString,
        },
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
  } else if (type === "summary") {
    // Implement summary logic
    // 1. Fetch all delivered orders for the branch and date
    const deliveredOrders = await prisma.dailyOrder.findMany({
      where: {
        branchId: branchId ?? undefined,
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
        status: "Delivered",
      },
      include: {
        driverAssignments: { include: { driver: true } },
        OrderProducts: {
          include: { product: true },
        },
        user: true,
      },
    });

    // 2. Aggregate summary data
    let totalDispatch = deliveredOrders.length;
    let deliveredProducts: any[] = [];
    let returnedProducts: any[] = [];
    let totalAmount = 0;
    let paymentMethods: Set<string> = new Set();
    let driverNames: Set<string> = new Set();

    deliveredOrders.forEach((order) => {
      // Driver name(s)
      if (order.driverAssignments && order.driverAssignments.length > 0) {
        order.driverAssignments.forEach((da) => {
          if (da.driver && da.driver.fullName)
            driverNames.add(da.driver.fullName);
        });
      }
      // Payment method(s)
      if (order.paymentMethod) paymentMethods.add(order.paymentMethod);
      // Total amount
      totalAmount += order.totalAmount || 0;
      // Delivered products
      order.OrderProducts.forEach((op) => {
        if (op.acceptedWeight && op.acceptedWeight > 0) {
          deliveredProducts.push({
            name: op.product?.name || "",
            weight: op.acceptedWeight,
          });
        }
        if (op.returnedWeight && op.returnedWeight > 0) {
          returnedProducts.push({
            name: op.product?.name || "",
            weight: op.returnedWeight,
          });
        }
      });
    });

    // Group by product name for delivered and returned
    const groupByProduct = (arr: any[]) => {
      const map = new Map();
      arr.forEach((item) => {
        if (!map.has(item.name)) map.set(item.name, 0);
        map.set(item.name, map.get(item.name) + item.weight);
      });
      return Array.from(map.entries()).map(([name, weight]) => ({
        name,
        weight,
      }));
    };

    const deliveredSummary = groupByProduct(deliveredProducts);
    const returnedSummary = groupByProduct(returnedProducts);

    // Format payment methods
    const paymentMethodList = Array.from(paymentMethods);
    // Format driver names
    const driverNameList = Array.from(driverNames);

    // Use the first delivery date in the range (or today)
    const deliveryDate = startDateString;

    return {
      deliveryDate,
      driverNames: driverNameList,
      totalDispatch,
      deliveredProducts: deliveredSummary,
      returnedProducts: returnedSummary,
      totalAmount,
      paymentMethods: paymentMethodList,
    };
  } else if (type === "salesOverview") {
    // total orders of the day
    const orderOfTheDay = await prisma.dailyOrder.count({
      where: {
        branchId: branchId ?? undefined,
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
      },
    });
    // total order product of the day
    const orderProductsOfTheDay = await prisma.totalProductOrder.count({
      where: {
        branchId: branchId ?? undefined,
        createdAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
    });
    // total revenue of the day
    const revenueOfTheDayAgg = await prisma.dailyOrder.aggregate({
      where: {
        branchId: branchId ?? undefined,
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
      },
      _sum: {
        totalAmount: true,
        RemainingAmount: true,
      },
    });

    const totalDeliveredHandlingCharge = await prisma.dailyOrder.aggregate({
      where: {
        branchId: branchId ?? undefined,
        status: "Delivered",
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
      },
      _sum: {
        handlingCharge: true,
      },
    });
    const totalReturnedHandlingCharge = await prisma.dailyOrder.aggregate({
      where: {
        branchId: branchId ?? undefined,
        status: "Returned",
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
      },
      _sum: {
        handlingCharge: true,
      },
    });
    const totalCancelledHandlingCharge = await prisma.dailyOrder.aggregate({
      where: {
        branchId: branchId ?? undefined,
        status: "Cancelled",
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
      },
      _sum: {
        handlingCharge: true,
      },
    });
    const totalActiveHandlingCharge = await prisma.dailyOrder.aggregate({
      where: {
        branchId: branchId ?? undefined,
        status: { in: ["Pending", "OnTheWay", "Active"] },
        orderDate: {
          gte: startDateString,
          lte: endDateString,
        },
      },
      _sum: {
        handlingCharge: true,
      },
    });

    // total return products of the day
    // totalProductOrder
    const returnProductsOfTheDay = await prisma.totalProductOrder.aggregate({
      where: {
        branchId: branchId ?? undefined,
        orderDateString: {
          gte: startDateString,
          lte: endDateString,
        },
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
      totalRevenue: revenueOfTheDayAgg._sum.totalAmount || 0,
      totalOrderProducts: orderProductsOfTheDay,
      totalReturnedWeight: returnProductsOfTheDay._sum.returnedWeight || 0, // KG
      totalReturnedPrice: returnProductsOfTheDay._sum.returnedPrice || 0,
      totalRemainingAmount: revenueOfTheDayAgg._sum.RemainingAmount || 0,
      handalingChargeControllers: {
        totalDeliveredHandlingCharge:
          totalDeliveredHandlingCharge._sum.handlingCharge || 0,
        totalReturnedHandlingCharge:
          totalReturnedHandlingCharge._sum.handlingCharge || 0,
        totalCancelledHandlingCharge:
          totalCancelledHandlingCharge._sum.handlingCharge || 0,
        totalActiveHandlingCharge:
          totalActiveHandlingCharge._sum.handlingCharge || 0,
      },
    };
  }
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

  // =================== INCENTIVE TRACKING ===================
  // Track driver progress when orders are assigned
  try {
    await updateDriverProgressOnAssignment(driverId, ordersIds.length);
  } catch (error) {
    console.error(
      "Error updating driver incentive progress on assignment:",
      error
    );
    // Don't fail the assignment if incentive tracking fails
  }

  // =================== NOTIFICATIONS ===================
  // Notify driver about new assignments
  try {
    await sendSingleNotification(
      driverId,
      `You have been assigned ${ordersIds.length} new order${ordersIds.length > 1 ? 's' : ''} for delivery. Check your delivery list!`,
      undefined,
      "New Orders Assigned"
    );

    // Notify customers that their order is on the way
    for (const order of existingOrders) {
      if (order.userId) {
        await sendSingleNotification(
          order.userId,
          `Good news! Your order is now on the way. Our delivery driver will reach you soon.`,
          undefined,
          "Order Out for Delivery"
        );
      }
    }
  } catch (error) {
    console.error("Failed to send assignment notifications:", error);
  }

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
          handlingCharge: true,
          note: true,
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

//** Reusable Function for Agent and Delivery Boy */

// const getTotalAssignedReturnedProducts = async (
//   user: JwtPayload,
//   query: any
// ) => {
//   //** Query have startDate and endDate  if provide in query then use those date if no then use today .   */
//   //** if user.role = "Driver then return his assigned orders return data if userRole is Agent then return his assigned Customers daily Orders Return data - hint : use switch case  */
//   // 1️ Get today's start and end times
//   const today = getDateString();
//   const startOfDay = query.startDate
//     ? new Date(new Date(query.startDate).setHours(0, 0, 0, 0))
//     : new Date(new Date(today).setHours(0, 0, 0, 0));
//   const endOfDay = query.endDate
//     ? new Date(new Date(query.endDate).setHours(23, 59, 59, 999))
//     : new Date(new Date(today).setHours(23, 59, 59, 999));

//   // 2 Get all assigned orders of the driver for today
//   let assignedOrders: string[] = [];
//   switch (user.role) {
//     case UserRole.Driver:
//       const assignedOrders = await prisma.driverAssignment.findMany({
//         where: {
//           driverId: user.id,
//           assignedAt: {
//             gte: startOfDay,
//             lte: endOfDay,
//           },
//         },
//       });

//       if (assignedOrders.length === 0) {
//         return {
//           totalAssignedProducts: [],
//           totalUniqueProducts: 0,
//         };
//       }
//       break;
//     case UserRole.Agent:
//       // Fetch all customers for this agent
//       const customers = await prisma.user.findMany({
//         where: { agentId: user.id },
//         select: { id: true },
//       });
//       const customerIds = customers.map((c) => c.id);

//       if (customerIds.length === 0) {
//         return {
//           totalReturnedProducts: [],
//           totalUniqueProducts: 0,
//         };
//       }

//       const orders = await prisma.dailyOrder.findMany({
//         where: {
//           userId: { in: customerIds },
//           orderDate: {
//             gte: startOfDay.toISOString(),
//             lte: endOfDay.toISOString(),
//           },
//         },
//       });
//   }

//   const orderIds = assignedOrders.map((o) => o.);

//   // 3 Group products by productId from those order products
//   const groupedProducts = await prisma.orderProduct.groupBy({
//     by: ["productId"],
//     where: {
//       orderId: { in: orderIds },
//     },
//     _sum: {
//       returnedWeight: true,
//       returnedPrice: true,
//     },
//     _count: {
//       orderId: true,
//     },
//   });

//   // 4️ Fetch product details for each productId
//   const productIds = groupedProducts.map((gp) => gp.productId);

//   const products = await prisma.product.findMany({
//     where: {
//       id: { in: productIds as string[] },
//     },
//     select: {
//       id: true,
//       name: true,
//       images: true,
//     },
//   });

//   // Create a lookup map
//   const productMap = new Map(products.map((p) => [p.id, p]));

//   // 5️ Build final result array

//   // Add On - If rturn weigth is 0 then do not include in the final result
//   const filteredGroupedProducts = groupedProducts.filter(
//     (gp) => (gp._sum.returnedWeight || 0) > 0
//   );
//   const finalResult = filteredGroupedProducts.map((gp) => {
//     const product = productMap.get(gp.productId!);

//     return {
//       productId: gp.productId,
//       productName: product?.name || "",
//       productImage:
//         product?.images && product.images.length > 0 ? product.images[0] : null,
//       totalReturnedWeight: gp._sum.returnedWeight || 0,
//       totalReturnedPrice: gp._sum.returnedPrice || 0,
//       orderCount: gp._count.orderId,
//     };
//   });

//   return {
//     totalReturnedProducts: finalResult,
//     totalUniqueProducts: finalResult.length,
//   };
// };

const getTotalAssignedReturnedProducts = async (
  user: JwtPayload,
  query: any
) => {
  // Get today or query dates
  const today = getDateString();

  const startOfDay = query.startDate
    ? new Date(new Date(query.startDate).setHours(0, 0, 0, 0))
    : new Date(new Date(today).setHours(0, 0, 0, 0));

  const endOfDay = query.endDate
    ? new Date(new Date(query.endDate).setHours(23, 59, 59, 999))
    : new Date(new Date(today).setHours(23, 59, 59, 999));

  // Convert to ISO since DB stores String
  const startISO = startOfDay.toISOString();
  const endISO = endOfDay.toISOString();

  let orderIds: string[] = [];

  // ------------------------------------------
  // ROLE BASED LOGIC
  // ------------------------------------------

  switch (user.role) {
    case UserRole.Driver: {
      const assigned = await prisma.driverAssignment.findMany({
        where: {
          driverId: user.id,
          assignedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: { dailyOrderId: true },
      });

      if (assigned.length === 0) {
        return {
          totalReturnedProducts: [],
          totalUniqueProducts: 0,
        };
      }

      orderIds = assigned.map((a) => a.dailyOrderId);
      break;
    }

    case UserRole.Agent: {
      // Fetch agent's customers
      const customers = await prisma.user.findMany({
        where: { agentId: user.id },
        select: { id: true },
      });

      const customerIds = customers.map((c) => c.id);
      if (customerIds.length === 0) {
        return {
          totalReturnedProducts: [],
          totalUniqueProducts: 0,
        };
      }

      // Fetch customer orders
      const orders = await prisma.dailyOrder.findMany({
        where: {
          userId: { in: customerIds },
          orderDate: {
            gte: startISO,
            lte: endISO,
          },
        },
        select: { id: true },
      });

      orderIds = orders.map((o) => o.id);
      break;
    }
  }

  // If no orders – return empty
  if (orderIds.length === 0) {
    return {
      totalReturnedProducts: [],
      totalUniqueProducts: 0,
    };
  }

  // ------------------------------------------
  // GROUP RETURNED PRODUCTS
  // ------------------------------------------
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

  // Filter only products with returned weight > 0
  const filteredGroupedProducts = groupedProducts.filter(
    (gp) => (gp._sum.returnedWeight || 0) > 0
  );

  if (filteredGroupedProducts.length === 0) {
    return {
      totalReturnedProducts: [],
      totalUniqueProducts: 0,
    };
  }

  // Fetch product details
  const productIds = filteredGroupedProducts.map((gp) => gp.productId);
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

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Build final response
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
const getTotalAssignedReturnedProductsForSuperAdmin = async (query: any) => {
  console.log("hitsssin");
  const { startDate, endDate, branchId, productCategoryId } = query || {};

  // Get today or query dates
  const today = getDateString();

  const startOfDay = query.startDate
    ? new Date(new Date(query.startDate).setHours(0, 0, 0, 0))
    : new Date(new Date(today).setHours(0, 0, 0, 0));

  const endOfDay = query.endDate
    ? new Date(new Date(query.endDate).setHours(23, 59, 59, 999))
    : new Date(new Date(today).setHours(23, 59, 59, 999));

  // Convert to ISO since DB stores String
  const startISO = startOfDay.toISOString();
  const endISO = endOfDay.toISOString();

  let orderIds: string[] = [];

  // ------------------------------------------
  // Branch based Logic
  // ------------------------------------------
  let branch = null;
  if (branchId) {
    branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new ApiError(httpStatus.NOT_FOUND, "Branch not found");
    }
  }
  const orders = await prisma.dailyOrder.findMany({
    where: {
      // if branchId is undefined, it will fetch orders without branch filter
      ...(branchId && { branchId: branchId }),
      orderDate: {
        gte: startISO,
        lte: endISO,
      },
      ...(productCategoryId && {
        OrderProducts: {
          some: {
            product: {
              categoryId: productCategoryId,
            },
          },
        },
      }),
    },
    select: { id: true, branchId: true },
  });

  orderIds = orders.map((o) => o.id);

  // If no orders – return empty
  if (orderIds.length === 0) {
    return {
      totalReturnedProducts: [],
      totalUniqueProducts: 0,
    };
  }

  // Create a map of orderId to branchId for later lookup
  const orderBranchMap = new Map(orders.map((o) => [o.id, o.branchId]));

  // ------------------------------------------
  // GROUP RETURNED PRODUCTS
  // ------------------------------------------
  const groupedProducts = await prisma.orderProduct.groupBy({
    by: ["productId", "orderId"],
    where: {
      orderId: { in: orderIds },
    },
    _sum: {
      returnedWeight: true,
      returnedPrice: true,
    },
  });

  // Filter only products with returned weight > 0
  const filteredGroupedProducts = groupedProducts.filter(
    (gp) => (gp._sum.returnedWeight || 0) > 0
  );

  if (filteredGroupedProducts.length === 0) {
    return {
      totalReturnedProducts: [],
      totalUniqueProducts: 0,
    };
  }

  // Fetch product details including categoryId
  const productIds = [
    ...new Set(filteredGroupedProducts.map((gp) => gp.productId)),
  ];
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds as string[] },
    },
    select: {
      id: true,
      name: true,
      images: true,
      categoryId: true,
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Aggregate by productId across all orders to get totals
  const productAggregates = new Map<
    string,
    {
      totalReturnedWeight: number;
      totalReturnedPrice: number;
      orderCount: number;
      branchIds: Set<string | null>;
    }
  >();

  filteredGroupedProducts.forEach((gp) => {
    const existing = productAggregates.get(gp.productId!);
    const branchId = orderBranchMap.get(gp.orderId!);

    if (existing) {
      existing.totalReturnedWeight += gp._sum.returnedWeight || 0;
      existing.totalReturnedPrice += gp._sum.returnedPrice || 0;
      existing.orderCount += 1;
      if (branchId) existing.branchIds.add(branchId);
    } else {
      productAggregates.set(gp.productId!, {
        totalReturnedWeight: gp._sum.returnedWeight || 0,
        totalReturnedPrice: gp._sum.returnedPrice || 0,
        orderCount: 1,
        branchIds: new Set(branchId ? [branchId] : []),
      });
    }
  });

  // Build final response
  const finalResult = Array.from(productAggregates.entries()).map(
    ([productId, aggregates]) => {
      const product = productMap.get(productId);
      // If multiple branches, take the first one or null
      const branchIdValue =
        aggregates.branchIds.size > 0
          ? Array.from(aggregates.branchIds)[0]
          : null;

      return {
        productId: productId,
        productName: product?.name || "",
        productImage:
          product?.images && product.images.length > 0
            ? product.images[0]
            : null,
        productCategoryId: product?.categoryId || null,
        branchId: branchIdValue,
        totalReturnedWeight: aggregates.totalReturnedWeight,
        totalReturnedPrice: aggregates.totalReturnedPrice,
        orderCount: aggregates.orderCount,
      };
    }
  );

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
      handlingCharge: true,
      note: true,
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

  let PaymentMethodPriority: PaymentMethod;

  //** ---- Jei payment use kore max amount pay korse seta assign korbo ------------------ */
  const sortPayments = payload.payments.sort((a, b) => b.amount - a.amount);
  PaymentMethodPriority = sortPayments[0].method as PaymentMethod;

  let deliveryProofUrl: string | undefined = undefined;

  if (deliveryProof) {
    deliveryProofUrl = (await uploadToDigitalOceanAWS(deliveryProof)).Location;
  }

  // Single DB update
  await prisma.dailyOrder.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.Delivered,
      paymentMethod: PaymentMethodPriority,
      RemainingAmount: { decrement: totalPaid },
      DeliveryProof: deliveryProofUrl,
    },
  });

  //* -------------  Jodi remaining value thake tahole payment method ke credit e convert korte hobe jeno credit order hisebe pawa jai ------------- *//
  //** Check still remaing exist or not! if Exist then change the isDues : true with paymentMethod : "credit"*/
  const order = await prisma.dailyOrder.findUnique({
    where: { id: orderId },
    select: { userId: true, RemainingAmount: true },
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

  // calculate delivered orders AFTER update
  const deliveredOrderCount = await prisma.$transaction(async (tx) => {
    return await tx.dailyOrder.count({
      where: {
        userId: order?.userId!,
        status: OrderStatus.Delivered,
      },
    });
  });

  // give referral bonus only for first delivery
  if (deliveredOrderCount === 1) {
    console.log("Hit the......!");
    const referralUser = await prisma.reffaralUsages.findFirst({
      where: { usedBy: order?.userId! },
      select: {
        reffaralUser: {
          select: {
            branchId: true,
            Wallet: { select: { id: true, balance: true } },
          },
        },
      },
    });

    console.log({ referralUser });

    if (referralUser?.reffaralUser?.Wallet) {
      console.log("hit the reffaral wallet.....!");

      const refarBalance = await prisma.incentive.findFirst({
        where: {
          branchId: referralUser.reffaralUser.branchId || undefined,
          type: "Refar",
        },
      });

      const walletId = referralUser.reffaralUser.Wallet.id;

      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: refarBalance?.rewardAmount || 40 } },
        });
        console.log("Created wallet transaction for referral bonus");
        await tx.walletTransaction.create({
          data: {
            walletId,
            amount: 40,
            type: "Credit",
            description: `${walletId} Referral bonus for first order delivery`,
            status: "Success",
          },
        });
      });
    }
  }

  // update assignment date always
  await prisma.driverAssignment.update({
    where: { id: assignment.id },
    data: { deliveryDate },
  });

  // =================== INCENTIVE TRACKING ===================
  // Track driver incentive progress for zero returns
  try {
    // Check if order has any returns (returned or rejected products)
    const orderWithProducts = await prisma.dailyOrder.findUnique({
      where: { id: orderId },
      include: {
        OrderProducts: true,
        user: {
          select: {
            agentId: true,
          },
        },
      },
    });

    const hasReturns =
      (orderWithProducts?.totalReturnedWeight || 0) > 0 ||
      (orderWithProducts?.totalRejectedWeight || 0) > 0;

    // Update driver progress
    await updateDriverProgressOnDelivery(driverId, orderId, hasReturns);

    // Update agent progress if customer has an agent
    if (orderWithProducts?.user?.agentId) {
      const orderAmount = orderWithProducts.totalAcceptedPrice || 0;
      await updateAgentProgress(orderWithProducts.user.agentId, orderAmount);
    }
  } catch (error) {
    console.error("Error updating incentive progress:", error);
    // Don't fail the delivery if incentive tracking fails
  }

  // =================== NOTIFICATIONS ===================
  // Notify customer about successful delivery
  try {
    if (order?.userId) {
      await sendSingleNotification(
        order.userId,
        `Your order has been delivered successfully! Total paid: ₹${totalPaid}. Thank you for your business!`,
        undefined,
        "Order Delivered"
      );
    }
  } catch (error) {
    console.error("Failed to send delivery notification:", error);
  }
};

const cancelOrderByCustomer = async (
  payload: ICancelOrderByCustomerPayload
) => {
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

    // Send notification to customer about order cancellation
    try {
      if (order.userId) {
        await sendSingleNotification(
          order.userId,
          `Your order has been cancelled. ${order.walletAmountUsed! > 0 ? `₹${order.walletAmountUsed} has been refunded to your wallet.` : ''}`,
          undefined,
          "Order Cancelled"
        );
      }
    } catch (error) {
      console.error("Failed to send order cancellation notification:", error);
    }

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

const returnOrderProduct = async (
  orderProductId: string,
  payload: IOrderAdjustMent
) => {
  const { returnWeight, returnPrice } = payload;

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
      newAcceptedWeight === 0 && newAcceptedPrice === 0
        ? "Returned"
        : "PartialReturned";

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
      select: {
        RemainingAmount: true,
        totalAcceptedPrice: true,
        totalAcceptedWeight: true,
      },
    });

    const prevRemaining = orderRow?.RemainingAmount || 0;
    const newRemaining = round2(
      Math.max(0, prevRemaining - remainingDecrement)
    );

    await tx.dailyOrder.update({
      where: { id: orderProduct.orderId! },
      data: {
        totalReturnedWeight: { increment: returnWeight },
        totalReturnedPrice: { increment: returnPrice },
        // optionally decrement totalAcceptedWeight/Price if you track those
        totalAcceptedWeight:
          orderRow?.totalAcceptedWeight !== undefined
            ? { decrement: returnWeight }
            : undefined,
        totalAcceptedPrice:
          orderRow?.totalAcceptedPrice !== undefined
            ? { decrement: returnPrice }
            : undefined,
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

const getSalesHistory = async (query: any) => {
  const {
    branchId,
    startDate,
    agentId,
    endDate,
    page = 1,
    limit = 10,
  } = query || {};

  const filters: any = { status: "Delivered" };

  if (branchId) filters.branchId = branchId;

  if (startDate) {
    filters.orderDate = {
      ...(filters.orderDate || {}),
      gte: startDate + "T00:00:00.000Z",
    };
  }

  if (endDate) {
    filters.orderDate = {
      ...(filters.orderDate || {}),
      lte: endDate + "T23:59:59.999Z",
    };
  }

  if (agentId) {
    // is Agent exists
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.role !== UserRole.Agent) {
      throw new ApiError(httpStatus.NOT_FOUND, "Agent not found");
    }
    // Fetch agent's customers
    const customers = await prisma.user.findMany({
      where: { agentId },
      select: { id: true },
    });
    filters.userId = { in: customers.map((c) => c.id) };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const totalCount = await prisma.dailyOrder.count({
    where: filters,
  });

  const rawData = await prisma.dailyOrder.findMany({
    where: filters,
    skip,
    take: Number(limit),
    orderBy: { orderDate: "desc" },
    select: {
      id: true,
      orderDate: true,
      totalAmount: true,
      totalWeight: true,
      handlingCharge: true,
      branchId: true,
      status: true,
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          phone: true,
          agentId: true,
        },
      },
      driverAssignments: {
        select: {
          driver: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
            },
          },
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  // 💥 Flatten the data here and add agent name/image
  const agentIds = Array.from(
    new Set(rawData.map((item) => item.user?.agentId).filter(Boolean))
  ) as string[];
  let agentMap: Record<
    string,
    { id: string; fullName: string | null; profileImage: string | null }
  > = {};
  if (agentIds.length > 0) {
    const agents = await prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, fullName: true, profileImage: true },
    });
    agentMap = agents.reduce((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {} as Record<string, { id: string; fullName: string | null; profileImage: string | null }>);
  }

  const formattedData = rawData.map((item) => {
    const driver = item.driverAssignments[0]?.driver;
    const agentId = item.user?.agentId || null;
    const agent = agentId ? agentMap[agentId] : null;
    return {
      id: item.id,
      orderDate: item.orderDate,
      totalAmount: item.totalAmount,
      totalWeight: item.totalWeight,
      branchId: item.branchId,
      status: item.status,

      userId: item.user?.id || null,
      userName: item.user?.fullName || null,
      userPhone: item.user?.phone || null,
      userImage: item.user?.profileImage || null,
      agentId,
      agentName: agent?.fullName || null,
      agentImage: agent?.profileImage || null,

      driverId: driver?.id || null,
      driverName: driver?.fullName || null,
      driverImage: driver?.profileImage || null,

      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });

  return {
    metadata: {
      page: Number(page),
      limit: Number(limit),
      totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
    },
    data: formattedData,
  };
};

const getUserOrdersOverview = async (query: any, agentId: string) => {
  const { startDate, endDate } = query || {};

  const dateFilter = {
    gte: startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : undefined,
    lte: endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : undefined,
  };

  // Fetch agent's customers
  const customers = await prisma.user.findMany({
    where: { agentId },
    select: { id: true },
  });

  const customerIds = customers.map((c) => c.id);

  // Helper function
  const getOrderSummary = (status: string) =>
    prisma.dailyOrder.aggregate({
      where: {
        userId: { in: customerIds },
        status: status as OrderStatus,
        createdAt: dateFilter,
      },
      _sum: {
        totalWeight: true,
        totalAmount: true,
      },
    });

  const totalPendingOrdersWeight = await getOrderSummary("Pending");
  const totalDeliveredOrdersWeight = await getOrderSummary("Delivered");
  const totalReturnedOrdersWeight = await getOrderSummary("Returned");

  return {
    Booked: {
      totalPendingOrdersWeight: totalPendingOrdersWeight._sum.totalWeight || 0,
      totalPendingOrdersAmount: totalPendingOrdersWeight._sum.totalAmount || 0,
    },
    Delivered: {
      totalDeliveredOrdersWeight:
        totalDeliveredOrdersWeight._sum.totalWeight || 0,
      totalDeliveredOrdersAmount:
        totalDeliveredOrdersWeight._sum.totalAmount || 0,
    },
    Returned: {
      totalReturnedOrdersWeight:
        totalReturnedOrdersWeight._sum.totalWeight || 0,
      totalReturnedOrdersAmount:
        totalReturnedOrdersWeight._sum.totalAmount || 0,
    },
  };
};

const getAssignOrderOverviewForDriver = async (
  query: any,
  driverId: string
) => {
  let { startDate, endDate } = query || {};

  // If no date provided → use today's date
  const today = new Date();
  if (!startDate || !endDate) {
    startDate = today;
    endDate = today;
  }

  const dateFilter = {
    gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
    lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
  };

  // 1. Get assigned order IDs for the driver
  const assignedOrders = await prisma.driverAssignment.findMany({
    where: {
      driverId,
      createdAt: dateFilter,
    },
    select: {
      dailyOrderId: true,
    },
  });

  const assignedOrderIds = assignedOrders.map((o) => o.dailyOrderId);
  if (query.type === "overview") {
    // 2. Helper function
    const getOrderSummary = (statuses: string[] | string) => {
      return prisma.dailyOrder.aggregate({
        where: {
          id: { in: assignedOrderIds },
          status: Array.isArray(statuses)
            ? {
                in: (statuses as string[]).map(
                  (s) => OrderStatus[s as keyof typeof OrderStatus]
                ),
              }
            : (OrderStatus as any)[statuses as keyof typeof OrderStatus],
          createdAt: dateFilter,
        },
        _sum: {
          totalWeight: true,
          totalAmount: true,
          handlingCharge: true,
        },
        _count: {
          id: true,
        },
      });
    };

    const dispatched = await getOrderSummary("OnTheWay");
    const delivered = await getOrderSummary("Delivered");
    const cancelled = await getOrderSummary("Cancelled");
    const returned = await getOrderSummary(["Returned", "PartialReturned"]);

    // 3. Return final result
    return {
      dispatched: {
        totalAmount: dispatched._sum.totalAmount || 0,
        totalWeight: dispatched._sum.totalWeight || 0,
        orderCount: dispatched._count.id || 0,
      },
      delivered: {
        totalAmount: delivered._sum.totalAmount || 0,
        totalWeight: delivered._sum.totalWeight || 0,
        orderCount: delivered._count.id || 0,
      },
      cancelled: {
        totalAmount: cancelled._sum.totalAmount || 0,
        totalWeight: cancelled._sum.totalWeight || 0,
        orderCount: cancelled._count.id || 0,
      },
      returned: {
        totalAmount: returned._sum.totalAmount || 0,
        totalWeight: returned._sum.totalWeight || 0,
        orderCount: returned._count.id || 0,
      },
      // handling cherge only delivered . couse we collect handling charge when delivered
      handlingCharge: {
        totalHandlingCharge: delivered._sum.handlingCharge || 0,
      },
    };
  } else if (query.type === "detailed") {
    // Fetch all detailed order information for assigned orders
    const orders = await prisma.dailyOrder.findMany({
      where: { id: { in: assignedOrderIds } },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
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
            OrderProductVariation: true,
          },
        },
        driverAssignments: {
          where: {
            driverId,
          },
          select: {
            assignedAt: true,
            deliveryDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!orders || orders.length === 0) {
      return [];
    }

    // Transform each order into the detailed format
    const detailedOrders = orders.map((order) => {
      // Calculate delivered and returned products
      const deliveredProducts = order.OrderProducts.filter(
        (op) => (op.acceptedWeight || 0) > 0
      ).map((op) => {
        const productName = op.product?.name || "";
        const weight = op.acceptedWeight || 0;
        return `${weight}kg (${productName})`;
      });

      const returnedProducts = order.OrderProducts.filter(
        (op) => (op.returnedWeight || 0) > 0 || (op.rejectedWeight || 0) > 0
      ).map((op) => {
        const productName = op.product?.name || "";
        const weight = (op.returnedWeight || 0) + (op.rejectedWeight || 0);
        return `${weight}kg (${productName})`;
      });

      // Calculate total crates dispatched (using total quantity of all products)
      const totalCrates = order.OrderProducts.reduce(
        (sum, op) => sum + (op.totalQuantity || 0),
        0
      );

      // Determine payment methods based on order data
      const paymentMethods: string[] = [];

      if (order.paymentMethod === PaymentMethod.Cash) {
        paymentMethods.push("Cash");
      }
      if (order.paymentMethod === PaymentMethod.Credit || order.isDues) {
        paymentMethods.push("Credit");
      }
      if (order.paymentMethod === PaymentMethod.Pre_Paid) {
        paymentMethods.push("Pre-paid");
      }
      if (order.paymentMethod === PaymentMethod.QrCode) {
        paymentMethods.push("QR Code");
      }
      if (order.paymentMethod === PaymentMethod.Wallet) {
        paymentMethods.push("Wallet");
      }
      if (order.paymentMethod === PaymentMethod.COD) {
        paymentMethods.push("Cash");
      }
      if (order.paymentMethod === PaymentMethod.Online) {
        paymentMethods.push("Online");
      }

      // If wallet amount was used, add it to payment methods
      if (
        (order.walletAmountUsed || 0) > 0 &&
        !paymentMethods.includes("Wallet")
      ) {
        paymentMethods.push("Wallet");
      }

      // Return comprehensive trip summary
      return {
        tripNumber: `#${order.id.slice(-8).toUpperCase()}`,
        deliveryDate: order.orderDate || "",
        driversName: order.user?.fullName || "N/A",
        totalDispatch: order.OrderProducts.length.toString().padStart(2, "0"),
        deliveredProduct: deliveredProducts,
        returnedProduct: returnedProducts,
        cratesDispatched: `${Math.ceil(totalCrates)} Crates`,
        totalAmount: `₹${(
          order.totalAcceptedPrice ||
          order.totalAmount ||
          0
        ).toFixed(2)}`,
        payment: paymentMethods,
        photo: order.DeliveryProof
          ? Array.isArray(order.DeliveryProof)
            ? order.DeliveryProof
            : [order.DeliveryProof]
          : [],
      };
    });

    return detailedOrders;
  } else {
    return {};
  }
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
  getMyCustomerOrders,
  createOrderByAgentForCustomer,
  getTotalAssignedReturnedProductsForSuperAdmin,
  getSalesHistory,
  getUserOrdersOverview,
  getAssignOrderOverviewForDriver,
};
