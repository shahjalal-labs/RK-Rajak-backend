import { PrismaClient, PaymentStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import crypto from "crypto";
import config from "../../../config";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

const generatePaymentId = () => {
  return `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

/**
 * Create wallet recharge payment
 */
// const createWalletRecharge = async (
//   payload: { amount: number },
//   userId: string
// ) => {
//   const { amount } = payload;

//   if (amount <= 0) {
//     throw new ApiError(httpStatus.BAD_REQUEST, "Amount must be greater than 0");
//   }

//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     include: { Wallet: true },
//   });

//   if (!user) {
//     throw new ApiError(httpStatus.NOT_FOUND, "User not found");
//   }

//   let wallet = user.Wallet;
//   if (!wallet) {
//     wallet = await prisma.wallet.create({
//       data: { userId },
//     });
//   }

//   const orderId = `order_${Date.now()}`;

//   const payloadData = {
//     order_id: orderId,
//     order_amount: amount,
//     order_currency: "INR",
//     customer_details: {
//       customer_id: user.id,
//       customer_email: user.email,
//       customer_phone: user.phone,
//     },
//     order_note: "WALLET_RECHARGE",
//     order_meta: {
//       walletId: wallet.id, // forwarded to webhook
//       return_url: "",
//       payment_methods: "cc,dc,nb,upi,paypal,ppc,emi,app,paylater",
//     },
//   };

//   const headers1 = {
//     "x-client-id": config.cashfree.app_id,
//     "x-client-secret": config.cashfree.secret_key,
//     "x-api-version": config.cashfree.api_version,
//     "x-idempotency-key": uuidv4(),
//   };
//   const headers2 = {
//     "x-client-id": config.cashfree.app_id,
//     "x-client-secret": config.cashfree.secret_key,
//     "x-api-version": config.cashfree.api_version,
//     "x-idempotency-key": uuidv4(),
//   };

//   try {
//     const response = await axios.post(
//       `${config.cashfree.cashfree_base_api}/orders`,
//       payloadData,
//       { headers: headers1 }
//     );

//     const cashfreeOrder = response.data;
//     const paymentSessionId = cashfreeOrder?.payment_session_id;

//     if (!paymentSessionId) {
//       console.error(
//         "❌ Cashfree API Response:",
//         JSON.stringify(cashfreeOrder, null, 2)
//       );
//       throw new Error("Payment session ID not returned by Cashfree API");
//     }

//     await prisma.walletRecharge.create({
//       data: {
//         walletId: wallet.id,
//         amount,
//         cashfreeOrderId: orderId,
//         paymentSessionId: paymentSessionId,
//         paymentStatus: PaymentStatus.Pending,
//       },
//     });

//     const payload = {
//       payment_session_id: response.data.payment_session_id,
//       payment_method: {
//         upi: { channel: "link" },
//        },
//     };

//     const response1 = await axios.post(
//       `${config.cashfree.cashfree_base_api}/orders/sessions`,
//       payload,
//       {
//         headers : headers2
//       }
//     );

//     return response1.data.data.payload.phonepe;
//   } catch (error: any) {
//     console.error("❌ Cashfree Error:", error.response?.data || error.message);
//     console.log(error);
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       "Failed to create Cashfree order"
//     );
//   }
// };

const createWalletRecharge = async (
  payload: { amount: number },
  userId: string
) => {
  const { amount } = payload;

  if (amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Amount must be greater than 0");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Wallet: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  let wallet = user.Wallet;
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId },
    });
  }

  const orderId = `order_${Date.now()}`;

  const payloadData = {
    order_id: orderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: user.id,
      customer_email: user.email,
      customer_phone: user.phone,
    },
    order_note: "WALLET_RECHARGE",
    order_meta: {
      walletId: wallet.id, // forwarded to webhook
      return_url: "",
      payment_methods: "cc,dc,nb,upi,paypal,ppc,emi,app,paylater",
      notify_url:
        "https://api.absfresh.co.in/api/v1/payment/webhook/wallet-recharge",
    },
  };

  const headers1 = {
    "x-client-id": config.cashfree.app_id,
    "x-client-secret": config.cashfree.secret_key,
    "x-api-version": config.cashfree.api_version,
    "x-idempotency-key": uuidv4(),
  };

  try {
    const response = await axios.post(
      `${config.cashfree.cashfree_base_api}/orders`,
      payloadData,
      { headers: headers1 }
    );

    const cashfreeOrder = response.data;
    const paymentSessionId = cashfreeOrder?.payment_session_id;

    if (!paymentSessionId) {
      console.error(
        "❌ Cashfree API Response:",
        JSON.stringify(cashfreeOrder, null, 2)
      );
      throw new Error("Payment session ID not returned by Cashfree API");
    }

    console.log("Recharge Pending................");
    await prisma.walletRecharge.create({
      data: {
        walletId: wallet.id,
        amount,
        cashfreeOrderId: orderId,
        paymentSessionId: paymentSessionId,
        paymentStatus: PaymentStatus.Pending,
      },
    });

    return cashfreeOrder;
  } catch (error: any) {
    console.error("❌ Cashfree Error:", error.response?.data || error.message);
    console.log(error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Failed to create Cashfree order"
    );
  }
};

/**
 * clear dues payment
 */
const clearDuesPayment = async (
  payload: {
    orderIds: string[];
  },
  userId: string
) => {
  const { orderIds } = payload;

  if (!orderIds || orderIds.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one order must be selected"
    );
  }

  // need to fecth orders and calculate total dues amount
  const ordersDetials = await Promise.all(
    orderIds.map(async (orderId) => {
      const order = await prisma.dailyOrder.findUnique({
        where: { id: orderId },
      });
      return order;
    })
  );

  const amount = ordersDetials.reduce((sum, order) => {
    if (order) {
      return sum + order.RemainingAmount;
    }
    return sum;
  }, 0);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Verify all orders
  const orders = await prisma.dailyOrder.findMany({
    where: {
      id: { in: orderIds },
      userId,
      isDues: true,
      duesCleared: false,
    },
  });

  if (orders.length !== orderIds.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Some orders not found or already cleared"
    );
  }

  const totalDues = orders.reduce(
    (sum, order) => sum + order.RemainingAmount,
    0
  );

  if (amount !== totalDues) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Payment amount doesn't match total dues`
    );
  }

  const orderId = `order_${Date.now()}`;

  const payloadData = {
    order_id: orderId,
    order_amount: totalDues,
    order_currency: "INR",
    customer_details: {
      customer_id: user.id,
      customer_email: user.email,
      customer_phone: user.phone,
    },
    order_note: "DUES_PAYMENT",
    order_meta: {
      orderIds: orderIds, // forwarded to webhook
      return_url: "",
      payment_methods: "cc,dc,nb,upi,paypal,ppc,emi,app,paylater",
      notify_url: "https://api.absfresh.co.in/api/v1/payment/webhook/dues-payment",
    },
  };

  const headers1 = {
    "x-client-id": config.cashfree.app_id,
    "x-client-secret": config.cashfree.secret_key,
    "x-api-version": config.cashfree.api_version,
    "x-idempotency-key": uuidv4(),
  };

  try {
    const response = await axios.post(
      `${config.cashfree.cashfree_base_api}/orders`,
      payloadData,
      { headers: headers1 }
    );

    const cashfreeOrder = response.data;
    return cashfreeOrder;
  } catch (error: any) {
    console.error("❌ Cashfree Error:", error.response?.data || error.message);
    console.log(error);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Failed to create Cashfree order"
    );
  }
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (
  rawBody: string | Buffer,
  headers: any,
  secret: string
): boolean => {
  const signature = headers["x-webhook-signature"];
  const timestamp = headers["x-webhook-timestamp"];

  if (!signature || !timestamp) return false;

  const bodyString = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : rawBody;
  const signedPayload = `${timestamp}${bodyString}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("base64");

  return signature === expectedSignature;
};

/**
 * Handle wallet recharge webhook
 */
const handleWalletRechargeWebhook = async (rawBody: any, headers: any) => {
  console.log("Hit the recharge webhook......!!!!");
  const payload = Buffer.isBuffer(rawBody)
    ? JSON.parse(rawBody.toString("utf8"))
    : rawBody;
  const walletSecret = config.cashfree.webhook_wallet_secret;
  const isValid = verifyWebhookSignature(rawBody, headers, walletSecret!);

  if (!isValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid webhook signature");
  }

  const { type, data } = payload;

  if (type === "PAYMENT_SUCCESS_WEBHOOK") {
    const { order_id, order_amount } = data.order;
    const { payment_amount } = data.payment;

    const walletRecharge = await prisma.walletRecharge.findFirst({
      where: { cashfreeOrderId: order_id },
      include: { wallet: true },
    });

    if (!walletRecharge) {
      throw new ApiError(httpStatus.NOT_FOUND, "Wallet recharge not found");
    }

    // Update wallet balance
    await prisma.$transaction([
      prisma.walletRecharge.update({
        where: { id: walletRecharge.id },
        data: { paymentStatus: PaymentStatus.Completed },
      }),
      prisma.wallet.update({
        where: { id: walletRecharge.walletId! },
        data: { balance: { increment: payment_amount } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: walletRecharge.walletId!,
          amount: payment_amount,
          type: "Credit",
          description: "Wallet recharge via online payment",
          status: "Success",
        },
      }),
    ]);

    return { message: "Wallet recharged successfully", amount: payment_amount };
  }

  return { message: "Webhook received" };
};

/**
 * Handle dues payment webhook
 */
const handleDuesPaymentWebhook = async (rawBody: any, headers: any) => {
  const payload = Buffer.isBuffer(rawBody)
    ? JSON.parse(rawBody.toString("utf8"))
    : rawBody;
  const duesSecret = config.cashfree.webhook_dues_secret;
  const isValid = verifyWebhookSignature(rawBody, headers, duesSecret!);

  if (!isValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid webhook signature");
  }

  const { type, data } = payload;

  if (type === "PAYMENT_SUCCESS_WEBHOOK") {
    const { order_id } = data.order;
    const { order_meta } = data.order;
    const { payment_amount } = data.payment;

    const orderIds: string[] = order_meta.orderIds;
    // Clear dues
    await prisma.$transaction([
      prisma.dailyOrder.updateMany({
        where: {
          id: { in: orderIds },
        },
        data: {
          isDues: false,
          duesCleared: true,
          RemainingAmount: 0,
          paymentMethod: "Online",
          duesClearedAt: new Date(),
        },
      }),
    ]);

    return { message: "Dues cleared successfully", amount: payment_amount };
  }

  return { message: "Webhook received" };
};

//** -------------------------       Pending Payments ----------------------- */

const getPendingPayments = async (userId: string) => {
  // Logic to fetch pending payments for the user
  const PendingOrders = await prisma.dailyOrder.findMany({
    where: {
      userId: userId,
      isDues: true,
      RemainingAmount: {
        gt: 0,
      },
    },
    // If frontend needs releted data or specific fields,  i will use includes or select here
  });

  return PendingOrders;
};

const getSalesAgentCustomersPendingAmounts = async (
  query: any,
  salesAgentId: string
) => {
  // Validate
  const salesAgent = await prisma.user.findUnique({
    where: { id: salesAgentId },
    select: { id: true },
  });

  if (!salesAgent) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Invalid Sales Agent ID. Please login again."
    );
  }

  const duesFilter = {
    isDues: true,
    RemainingAmount: { gt: 0 },
  };

  // Fetch users
  const pendingAmounts = await prisma.user.findMany({
    where: {
      agentId: salesAgent.id,
      fullName: query.searchTerm ? String(query.searchTerm) : undefined,
      dailyOrders: { some: duesFilter },
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      profileImage: true,
      dailyOrders: {
        where: duesFilter,
        select: {
          id: true,
          RemainingAmount: true,
          totalAmount: true,
          createdAt: true,
        },
      },
    },
  });

  let totalDuesAmount = 0;
  let totalOrdersWithDues = 0;

  pendingAmounts.forEach((user: any) => {
    //  Add per-user total dues
    user.userTotalRemaining = user.dailyOrders.reduce(
      (sum: number, order: any) => sum + order.RemainingAmount,
      0
    );

    // Global stats
    user.dailyOrders.forEach((order: any) => {
      totalDuesAmount += order.RemainingAmount;
      totalOrdersWithDues++;
    });
  });

  const headersData = {
    totalDuesAmount,
    totalShopsWithDues: pendingAmounts.length,
    totalOrdersWithDues,
  };

  return { headersData, pendingAmounts };
};

const getPaymentDetails = async (userId: string) => {
  // Logic to fetch payment details by paymentId
  // Fetch all customers with dues
  const duesFilter = {
    isDues: true,
    RemainingAmount: { gt: 0 },
  };

  const pendingAmounts = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      profileImage: true,
      // need to sum total dues amount per user
      dailyOrders: {
        where: duesFilter,
        select: {
          id: true,
          RemainingAmount: true,
          totalAmount: true,
          createdAt: true,
        },
      },
    },
  });

  return pendingAmounts;
};

export const PaymentServices = {
  createWalletRecharge,
  clearDuesPayment,
  handleWalletRechargeWebhook,
  handleDuesPaymentWebhook,
  getPendingPayments,
  getSalesAgentCustomersPendingAmounts,
  getPaymentDetails,
};
