import { getDateString } from "../order/order.helpers";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import { branch, product } from "@prisma/client";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameWeek,
  isSameMonth,
  format,
  subYears,
  eachYearOfInterval,
  isSameYear,
} from "date-fns";

const getOverview = async (query: any) => {
  const { startDate, endDate, type, branchId } = query || {};
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
        totalAcceptedWeight: true,
      },
    });

    // total new users of the day
    const newUsersOfTheDay = await prisma.user.count({
      where: {
        branchId: branchId ?? undefined,
        createdAt: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
    });

    return {
      totalOrders: orderOfTheDay,
      totalRevenue: revenueOfTheDayAgg._sum.totalAmount || 0,
      totalWeightInKG: revenueOfTheDayAgg._sum.totalAcceptedWeight || 0, // KG
      totalNewUser: newUsersOfTheDay || 0,
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
    const deliveryDate = `${startDateString} to ${endDateString}`;

    return {
      deliveryDate,
      driverNames: driverNameList,
      totalDispatch,
      deliveredProducts: deliveredSummary,
      returnedProducts: returnedSummary,
      totalAmount,
      paymentMethods: paymentMethodList,
    };
  }
};

const buildChart = (
  items: any[],
  filter: string,
  dateKey: string,
  getValue: (items: any[]) => number,
  interval: { start: Date; end: Date }
) => {
  if (filter === "daily") {
    return eachDayOfInterval(interval).map((day) => {
      const list = items.filter((i) => isSameDay(i[dateKey], day));
      return { label: format(day, "EEE"), value: getValue(list) };
    });
  }

  if (filter === "weekly") {
    return eachWeekOfInterval(interval, { weekStartsOn: 0 }).map((week, i) => {
      const list = items.filter((i) =>
        isSameWeek(i[dateKey], week, { weekStartsOn: 0 })
      );
      return { label: `Week ${i + 1}`, value: getValue(list) };
    });
  }

  if (filter === "monthly") {
    return eachMonthOfInterval(interval).map((month) => {
      const list = items.filter((i) => isSameMonth(i[dateKey], month));
      return { label: format(month, "MMMM"), value: getValue(list) };
    });
  }

  if (filter === "yearly") {
    return eachYearOfInterval(interval).map((year) => {
      const list = items.filter((i) => isSameYear(i[dateKey], year));
      return { label: format(year, "yyyy"), value: getValue(list) };
    });
  }

  return [];
};

const getEarningReports = async (query: {
  filter: "daily" | "weekly" | "monthly" | "yearly";
  dataType: "Revenue" | "Quantity" | "Orders" | "NewCustomer";
}) => {
  const now = new Date();
  let interval;

  if (query.filter === "daily") {
    interval = { start: startOfWeek(now), end: endOfWeek(now) };
  } else if (query.filter === "weekly") {
    interval = { start: startOfMonth(now), end: endOfMonth(now) };
  } else if (query.filter === "monthly") {
    interval = { start: startOfYear(now), end: endOfYear(now) };
  } else {
    interval = {
      start: subYears(startOfYear(now), 4),
      end: endOfYear(now),
    };
  }

  // 🧑 New Customers
  if (query.dataType === "NewCustomer") {
    const users = await prisma.user.findMany({
      where: {
        role: "Customer",
        createdAt: { gte: interval.start, lte: interval.end },
      },
    });

    return {
      filter: query.filter,
      chartData: buildChart(
        users,
        query.filter,
        "createdAt",
        (list) => list.length,
        interval
      ),
    };
  }

  // 📦 Orders / 💰 Revenue / ⚖️ Quantity
  const orders = await prisma.dailyOrder.findMany({
    where: {
      status: "Delivered",
      orderDate: {
        gte: format(interval.start, "yyyy-MM-dd"),
        lte: format(interval.end, "yyyy-MM-dd"),
      },
    },
  });

  // 💰 Revenue
  if (query.dataType === "Revenue") {
    return {
      filter: query.filter,
      chartData: buildChart(
        orders,
        query.filter,
        "orderDate",
        (list) => list.reduce((sum, o) => sum + o.totalAmount, 0),
        interval
      ),
    };
  }

  // ⚖️ Quantity (KG sold)
  if (query.dataType === "Quantity") {
    return {
      filter: query.filter,
      chartData: buildChart(
        orders,
        query.filter,
        "orderDate",
        (list) => list.reduce((sum, o) => sum + o.totalWeight, 0),
        interval
      ),
    };
  }

  // 📦 Orders count
  if (query.dataType === "Orders") {
    return {
      filter: query.filter,
      chartData: buildChart(
        orders,
        query.filter,
        "orderDate",
        (list) => list.length,
        interval
      ),
    };
  }

  throw new Error("Invalid data type");
};

const getProductCalculations = async (query: any) => {
  const { branchId, startDate, endDate } = query || {};
  // Fetch all delivered order products for the branch and date range
  const orderProducts = await prisma.orderProduct.findMany({
    where: {
      order: {
        branchId: branchId ?? undefined,
        orderDate: {
          gte: startDate || undefined,
          lte: endDate || undefined,
        },
        status: "Delivered",
      },
    },
    include: {
      product: { select: { name: true } },
    },
  });

  // Group by product name and sum totalWeight
  const productMap = new Map();
  let totalWeight = 0;
  orderProducts.forEach((op) => {
    const name = op.product?.name || "Unknown";
    const weight = op.totalWeight || 0;
    totalWeight += weight;
    if (!productMap.has(name)) productMap.set(name, 0);
    productMap.set(name, productMap.get(name) + weight);
  });

  // Prepare result array
  const productCalculations = Array.from(productMap.entries()).map(
    ([name, weight]) => ({
      product: name,
      weightKg: weight,
      weightTon: +(weight / 1000).toFixed(3),
    })
  );

  return {
    products: productCalculations,
    totalWeightKg: totalWeight,
    totalWeightTon: +(totalWeight / 1000).toFixed(3),
  };
};

const getHighestSellingProducts = async (query: any) => {
  const {
    branchId,
    startDate,
    endDate,
    productCategoryId,
    page = 1,
    limit = 10,
    type,
  } = query || {};

  // --------------------------------------------------
  // 1 Fetch delivered order products from DB
  // --------------------------------------------------
  const orderProducts = await prisma.orderProduct.findMany({
    where: {
      order: {
        branchId: branchId ?? undefined,
        orderDate: {
          gte: startDate || undefined,
          lte: endDate || undefined,
        },
        status: "Delivered",
      },
      ...(productCategoryId && {
        product: {
          categoryId: productCategoryId,
        },
      }),
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          branchId: true,
          category: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      OrderProductVariation: {
        include: {
          variation: {
            select: {
              realPrice: true,
              sellingPrice: true,
            },
          },
        },
      },
    },
  });

  // --------------------------------------------------
  // 2️ Aggregate data per product using Map
  // --------------------------------------------------
  const productMap = new Map<string, any>();

  for (const op of orderProducts) {
    const productName = op.product?.name || "Unknown";
    const categoryName = op.product?.category?.name || null;
    const categoryImage = op.product?.category?.image || null;

    const weightKg = op.totalWeight || 0;
    const revenue = op.totalPrice || 0;

    let profit = 0;
    let loss = 0;
    let totalRealAmount = 0;

    //  CORRECT VARIANT-WISE CALCULATION
    for (const v of op.OrderProductVariation || []) {
      const realPrice = v.OrderTimeRealPrice || 0;
      const sellingPrice = v.OrderTimeSellingPrice || 0;
      const qty = v.quantity || 0;

      totalRealAmount += realPrice * qty;

      if (sellingPrice >= realPrice) {
        profit += (sellingPrice - realPrice) * qty;
      } else {
        loss += (realPrice - sellingPrice) * qty;
      }
    }

    if (!productMap.has(productName)) {
      productMap.set(productName, {
        product: productName,
        categoryName,
        categoryImage,
        weightKg: 0,
        weightTon: 0,
        deliveryCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalLoss: 0,
        margin: 0,
      });
    }

    const prodData = productMap.get(productName);

    prodData.weightKg += weightKg;
    prodData.weightTon = +(prodData.weightKg / 1000).toFixed(3);
    prodData.deliveryCount += 1;
    prodData.totalRevenue += revenue;
    prodData.totalProfit += profit;
    prodData.totalLoss += loss;
    prodData.categoryId = op.product?.category?.id;
    prodData.branchId = op.product?.branchId;

    // ⚠️ margin average
    prodData.margin =
      prodData.totalRevenue > 0
        ? +(
            ((prodData.totalProfit - prodData.totalLoss) /
              prodData.totalRevenue) *
            100
          ).toFixed(2)
        : 0;

    productMap.set(productName, prodData);
  }

  // --------------------------------------------------
  // 3️ Convert Map → Array
  // --------------------------------------------------
  let products = Array.from(productMap.values());

  // --------------------------------------------------
  // 4️ Sort by total weight (DESC) - For better understanding highest selling
  // --------------------------------------------------
  if (type == "HighestSelling") {
    products.sort((a, b) => b.weightKg - a.weightKg);
  }

  //** ------ Previous Logic ---- Now it can handle pagination internally  */
  // // --------------------------------------------------
  // // 5️ Apply business rule
  // // --------------------------------------------------
  // let finalProducts;

  // if (products.length > 30) {
  //   // 🔥 Top 60% selling products jodi seta 30 er upore hoi with paginations
  //   const topCount = Math.ceil(products.length * 0.6);
  //   finalProducts = products.slice(0, topCount);
  // } else {
  //   //  jodi total products 30 er kom hoi return all with paginations
  //   const startIndex = (page - 1) * limit;
  //   finalProducts = products.slice(startIndex, startIndex + limit);
  // }

  // --------------------------------------------------
  // 6️ Return response
  // --------------------------------------------------
  return {
    metaData: {
      type: type || "avarageSelling",
      page: Number(page),
      limit: Number(limit),
      totalProducts: products.length,
    },
    products: products,
  };
};

const getOverallProfit = async (query: any) => {
  const { branchId, startDate, endDate } = query || {};

  // return totalProfit and product name with totalProfit sorted by totalProfit descending
  const orderProducts = await prisma.orderProduct.findMany({
    where: {
      order: {
        branchId: branchId ?? undefined,
        orderDate: {
          gte: startDate || undefined,
          lte: endDate || undefined,
        },
        status: "Delivered",
      },
    },
    include: {
      product: {
        select: {
          name: true,
        },
      },
      OrderProductVariation: {
        include: {
          variation: {
            select: {
              realPrice: true,
              sellingPrice: true,
            },
          },
        },
      },
    },
  });

  let totalProfit = 0;
  const productProfitMap = new Map<string, number>(); // name and total profit in this product

  for (const op of orderProducts) {
    // CORRECT VARIANT-WISE CALCULATION
    for (const v of op.OrderProductVariation || []) {
      const realPrice = v.OrderTimeRealPrice || 0;
      const sellingPrice = v.OrderTimeSellingPrice || 0;
      totalProfit += (sellingPrice - realPrice) * (v.quantity || 0); // Gross profit * quantity

      const productName = op.product?.name || "Unknown Product";
      const currentProfit = productProfitMap.get(productName) || 0;
      productProfitMap.set(
        productName,
        currentProfit + (sellingPrice - realPrice) * (v.quantity || 0)
      );
    }
  }

  return {
    totalProfit,
    productProfits: Array.from(productProfitMap.entries())
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit),
  };
};

const getTonnageCalculation = async (query: {
  branchId?: string;
  startDate?: string;
  endDate?: string;
  filter?: "daily" | "weekly" | "monthly" | "yearly";
}) => {
  const { branchId, filter } = query || {};
  const now = new Date();
  let interval;

  if (filter === "daily") {
    interval = { start: startOfWeek(now), end: endOfWeek(now) };
  } else if (filter === "weekly") {
    interval = { start: startOfMonth(now), end: endOfMonth(now) };
  } else if (filter === "monthly") {
    interval = { start: startOfYear(now), end: endOfYear(now) };
  } else {
    interval = {
      start: subYears(startOfYear(now), 4),
      end: endOfYear(now),
    };
  }

  // Fetch delivered orders in the interval
  const orders = await prisma.dailyOrder.findMany({
    where: {
      branchId: branchId ?? undefined,
      status: "Delivered",
      createdAt: { gte: interval.start, lte: interval.end },
    },
    select: {
      totalAcceptedWeight: true,
      totalReturnedWeight: true,
      createdAt: true,
    },
  });

  // Helper to group orders by period
  function groupByPeriod(
    orders: Array<{ totalAcceptedWeight?: number; totalReturnedWeight?: number; createdAt: Date }>,
    filter: string
  ) {
    const map = new Map();
    for (const order of orders) {
      let key;
      if (filter === "daily") key = format(order.createdAt, "yyyy-MM-dd");
      else if (filter === "weekly") key = format(order.createdAt, "yyyy-'W'II");
      else if (filter === "monthly") key = format(order.createdAt, "yyyy-MM");
      else key = format(order.createdAt, "yyyy");
      if (!map.has(key)) map.set(key, { delivered: 0, returned: 0 });
      map.get(key).delivered += order.totalAcceptedWeight || 0;
      map.get(key).returned += order.totalReturnedWeight || 0;
    }
    return map;
  }

  // Map nulls to undefined for type compatibility
  const safeOrders = orders.map(o => ({
    totalAcceptedWeight: o.totalAcceptedWeight ?? undefined,
    totalReturnedWeight: o.totalReturnedWeight ?? undefined,
    createdAt: o.createdAt
  }));
  const grouped = groupByPeriod(safeOrders, filter || "daily");
  // Prepare chart data: [{ label, delivered, returned }]
  let chartData = [];
  if (filter === "daily") {
    chartData = eachDayOfInterval(interval).map((day) => {
      const label = format(day, "EEE");
      const key = format(day, "yyyy-MM-dd");
      const data = grouped.get(key) || { delivered: 0, returned: 0 };
      return { label, delivered: data.delivered, returned: data.returned };
    });
  } else if (filter === "weekly") {
    chartData = eachWeekOfInterval(interval, { weekStartsOn: 0 }).map((week, i) => {
      const label = `Week ${i + 1}`;
      const key = format(week, "yyyy-'W'II");
      const data = grouped.get(key) || { delivered: 0, returned: 0 };
      return { label, delivered: data.delivered, returned: data.returned };
    });
  } else if (filter === "monthly") {
    chartData = eachMonthOfInterval(interval).map((month) => {
      const label = format(month, "MMMM");
      const key = format(month, "yyyy-MM");
      const data = grouped.get(key) || { delivered: 0, returned: 0 };
      return { label, delivered: data.delivered, returned: data.returned };
    });
  } else {
    chartData = eachYearOfInterval(interval).map((year) => {
      const label = format(year, "yyyy");
      const key = format(year, "yyyy");
      const data = grouped.get(key) || { delivered: 0, returned: 0 };
      return { label, delivered: data.delivered, returned: data.returned };
    });
  }

  return {
    filter: query.filter,
    chartData,
  };
};

export const ownerServices = {
  getOverview,
  getEarningReports,
  getProductCalculations,
  getHighestSellingProducts,
  getOverallProfit,
  getTonnageCalculation,
};
