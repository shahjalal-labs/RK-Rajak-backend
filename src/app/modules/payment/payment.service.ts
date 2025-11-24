import { PrismaClient, PaymentStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import crypto from "crypto";
import config from "../../../config";
import { createCashfreeOrder } from "./cashfree";

const prisma = new PrismaClient();

const generatePaymentId = () => {
  return `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

/**
 * Create wallet recharge payment
 */
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

  // Create wallet if doesn't exist
  let wallet = user.Wallet;
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId },
    });
  }

  const paymentId = generatePaymentId();

  // Create Cashfree order
  const cashfreeOrder = await createCashfreeOrder({
    orderId: paymentId,
    amount,
    customerName: user.fullName || user.phone,
    customerPhone: user.phone,
    customerEmail: user.email ?? "",
    returnUrl: `${config.frontend_base_url}/wallet/callback?paymentId=${paymentId}`,
    notifyUrl: `${config.backend_base_url}/api/v1/payment/webhook/wallet-recharge`,
  });

  // Save wallet recharge record
  const walletRecharge = await prisma.walletRecharge.create({
    data: {
      walletId: wallet.id,
      amount,
      cashfreeOrderId: cashfreeOrder.order_id,
      paymentSessionId: cashfreeOrder.payment_session_id,
      paymentStatus: PaymentStatus.Pending,
    },
  });

  return {
    walletRecharge,
    paymentSessionId: cashfreeOrder.payment_session_id,
    cashfreeOrderId: cashfreeOrder.order_id,
    message: "Use payment_session_id on frontend with Cashfree Checkout SDK",
  };
};

/**
 * Create dues payment
 */
const createDuesPayment = async (payload: {
  orderIds: string[];
} , userId: string) => {
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
      return sum + order.totalAmount;
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

  const totalDues = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  if (amount !== totalDues) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Payment amount doesn't match total dues`
    );
  }

  const paymentId = generatePaymentId();

  const cashfreeOrder = await createCashfreeOrder({
    orderId: paymentId,
    amount,
    customerName: user.fullName || user.phone,
    customerPhone: user.phone,
    customerEmail: user.email ? "" : "",
    returnUrl: `${config.frontend_base_url}/dues/callback?paymentId=${paymentId}`,
    notifyUrl: `${config.backend_base_url}/api/v1/payment/webhook/dues-payment`,
  });

  // const duesPayment = await prisma.duesPayment.create({
  //   data: {
  //     userId,
  //     orderIds,
  //     amount,
  //     cashfreeOrderId: cashfreeOrder.order_id,
  //     paymentSessionId: cashfreeOrder.payment_session_id,
  //     paymentStatus: PaymentStatus.Pending,
  //   },
  // });

  // return {
  //   duesPayment,
  //   paymentSessionId: cashfreeOrder.payment_session_id,
  //   cashfreeOrderId: cashfreeOrder.order_id,
  //   orders: orders.map((o) => ({ orderId: o.orderId, amount: o.totalAmount })),
  //   message: "Use payment_session_id on frontend with Cashfree Checkout SDK",
  // };
};

/**
 * Get user's dues orders
 */
const getUserDues = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeDuesCount: true,
      totalDuesAmount: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // const duesOrders = await prisma.dailyOrder.findMany({
  //   where: {
  //     userId,
  //     isDues: true,
  //     duesCleared: false,
  //   },
  //   include: {
  //     products: {
  //       include: {
  //         product: true,
  //       },
  //     },
  //     shippingAddress: true,
  //   },
  //   orderBy: {
  //     createdAt: "desc",
  //   },
  // });

  // return {
  //   activeDuesCount: user.activeDuesCount,
  //   totalDuesAmount: user.totalDuesAmount,
  //   canTakeCredit: user.activeDuesCount < 3,
  //   duesOrders,
  // };
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (
  rawBody: string | Buffer,
  headers: any
): boolean => {
  const signature = headers["x-webhook-signature"];
  const timestamp = headers["x-webhook-timestamp"];

  if (!signature || !timestamp) return false;

  const bodyString = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : rawBody;
  const signedPayload = `${timestamp}${bodyString}`;
  const expectedSignature = crypto
    .createHmac("sha256", config.cashfree.webhook_secret!)
    .update(signedPayload)
    .digest("base64");

  return signature === expectedSignature;
};

/**
 * Handle wallet recharge webhook
 */
const handleWalletRechargeWebhook = async (rawBody: any, headers: any) => {
  const payload = Buffer.isBuffer(rawBody)
    ? JSON.parse(rawBody.toString("utf8"))
    : rawBody;
  const isValid = verifyWebhookSignature(rawBody, headers);

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
    // await prisma.$transaction([
    //   prisma.walletRecharge.update({
    //     where: { id: walletRecharge.id },
    //     data: { paymentStatus: PaymentStatus.Success },
    //   }),
    //   prisma.wallet.update({
    //     where: { id: walletRecharge.walletId! },
    //     data: { balance: { increment: payment_amount } },
    //   }),
    //   prisma.walletTransaction.create({
    //     data: {
    //       walletId: walletRecharge.walletId!,
    //       amount: payment_amount,
    //       type: "Credit",
    //       description: "Wallet recharge via online payment",
    //       status: "Success",
    //     },
    //   }),
    // ]);

    // return { message: "Wallet recharged successfully", amount: payment_amount };
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
  const isValid = verifyWebhookSignature(rawBody, headers);

  if (!isValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid webhook signature");
  }

  const { type, data } = payload;

  // if (type === "PAYMENT_SUCCESS_WEBHOOK") {
  //   const { order_id } = data.order;
  //   const { payment_amount } = data.payment;

  //   const duesPayment = await prisma.duesPayment.findFirst({
  //     where: { cashfreeOrderId: order_id },
  //     include: { user: true },
  //   });

  //   if (!duesPayment) {
  //     throw new ApiError(httpStatus.NOT_FOUND, "Dues payment not found");
  //   }

  //   // Clear dues
  //   await prisma.$transaction([
  //     prisma.duesPayment.update({
  //       where: { id: duesPayment.id },
  //       data: { paymentStatus: PaymentStatus.Success },
  //     }),
  //     prisma.order.updateMany({
  //       where: { id: { in: duesPayment.orderIds } },
  //       data: {
  //         duesCleared: true,
  //         duesClearedAt: new Date(),
  //         isPaid: true,
  //       },
  //     }),
  //     prisma.user.update({
  //       where: { id: duesPayment.userId! },
  //       data: {
  //         activeDuesCount: { decrement: duesPayment.orderIds.length },
  //         totalDuesAmount: { decrement: payment_amount },
  //       },
  //     }),
  //   ]);

  //   return { message: "Dues cleared successfully", amount: payment_amount };
  // }

  return { message: "Webhook received" };
};

export const PaymentServices = {
  createWalletRecharge,
  createDuesPayment,
  getUserDues,
  handleWalletRechargeWebhook,
  handleDuesPaymentWebhook,
};
