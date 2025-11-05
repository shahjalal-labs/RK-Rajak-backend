import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

/**
 * Merge daily orders into MainOrder
 * Runs at 12:00 AM every day
 */
export const mergeDailyOrders = async () => {
  try {

      console.log("Starting daily order merge...");
      
      // Get yesterday's date range
      const today = new Date();

    // for testing purpose i need to set the time like 5 minutes  instead of midnight
    // today.setMinutes(today.getMinutes() + 5);    
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const endOfYesterday = new Date(today);
    endOfYesterday.setMilliseconds(-1);

    // Fetch all orders from yesterday without mainOrderId
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: yesterday,
          lte: endOfYesterday,
        },
        mainOrderId: null,
      },
      include: {
        products: true,
      },
    });

    if (orders.length === 0) {
      console.log("No orders to merge for yesterday");
      return;
    }

    // Group orders by user
    const ordersByUser = orders.reduce((acc, order) => {
      if (!acc[order.userId!]) {
        acc[order.userId!] = [];
      }
      acc[order.userId!].push(order);
      return acc;
    }, {} as Record<string, typeof orders>);

    // Create MainOrder for each user
    for (const [userId, userOrders] of Object.entries(ordersByUser)) {
      const totalAmount = userOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalReturnedAmount = userOrders.reduce(
        (sum, order) => sum + (order.totalReturnedAmount || 0),
        0
      );
      const totalWalletUsed = userOrders.reduce(
        (sum, order) => sum + (order.walletAmountUsed || 0),
        0
      );
      const totalOnlinePaid = userOrders.reduce(
        (sum, order) => sum + (order.onlineAmountPaid || 0),
        0
      );

      // Calculate pending amount (COD + unpaid orders)
      const pendingAmount = userOrders.reduce((sum, order) => {
        if (order.paymentMethod === "COD") {
          return sum + (order.totalAmount - (order.totalReturnedAmount || 0));
        } else if (!order.isPaid) {
          return sum + (order.totalAmount - (order.totalReturnedAmount || 0));
        }
        return sum;
      }, 0);

      // Create MainOrder with transaction
      await prisma.$transaction(async (tx) => {
        const mainOrder = await tx.mainOrder.create({
          data: {
            userId,
            totalAmount,
            pendingAmount,
            totalReturnedAmount,
            totalWalletUsed,
            totalOnlinePaid,
            orderDate: yesterday,
          },
        });

        // Link all orders to MainOrder
        await tx.order.updateMany({
          where: {
            id: {
              in: userOrders.map((o) => o.id),
            },
          },
          data: {
            mainOrderId: mainOrder.id,
          },
        });

        console.log(
          `Created MainOrder ${mainOrder.id} for user ${userId} with ${userOrders.length} orders`
        );
      });
    }

    console.log("Daily order merge completed successfully");
  } catch (error) {
    console.error("Error in daily order merge:", error);
  }
};

/**
 * Schedule cron job to run at 12:00 AM every day
 */
export const scheduleDailyOrderMerge = () => {
  // Run at 12:00 AM every day (0 0 * * *)
  // for testing purpose i need to set the time like 5 minutes  instead of midnight
  console.log("start the por corn job")
  cron.schedule("*/5 * * * *", async () => {
    console.log("✅ Hitting the cron job");
    await mergeDailyOrders();
  });

  console.log("Daily order merge cron job scheduled at 5 minutes interval");
};

/**
 * Get MainOrder by date for a user
 */
export const getMainOrderByDate = async (userId: string, date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await prisma.mainOrder.findFirst({
    where: {
      userId,
      orderDate: {
        gte: startOfDay,
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
        },
      },
    },
  });
};

/**
 * Get all MainOrders for a user
 */
export const getUserMainOrders = async (userId: string) => {
  return await prisma.mainOrder.findMany({
    where: { userId },
    include: {
      orders: {
        include: {
          products: {
            include: {
              product: true,
            },
          },
          shippingAddress: true,
        },
      },
    },
    orderBy: {
      orderDate: "desc",
    },
  });
};
