import { PrismaClient, PaymentStatus, OrderStatus } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { verifyCashfreePayment, getCashfreeOrderDetails } from "../../../helpers/cashfree";
import crypto from "crypto";
import config from "../../../config";

const prisma = new PrismaClient();

/**
 * Verify Cashfree webhook signature
 * This ensures the webhook is actually from Cashfree
 */
const verifyWebhookSignature = (
  body: any,
  headers: any
): boolean => {
  const signature = headers["x-webhook-signature"];
  const timestamp = headers["x-webhook-timestamp"];

  if (!signature || !timestamp) {
    return false;
  }

  // Create signature using webhook secret
  const signedPayload = `${timestamp}${JSON.stringify(body)}`;
  const expectedSignature = crypto
    .createHmac("sha256", config.cashfree.webhook_secret!)
    .update(signedPayload)
    .digest("base64");

  return signature === expectedSignature;
};

/**
 * Handle Cashfree webhook
 */
const handleCashfreeWebhook = async (payload: any, headers: any) => {
  console.log("Cashfree webhook received:", payload);

  // Verify webhook signature
  const isValid = verifyWebhookSignature(payload, headers);
  if (!isValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid webhook signature");
  }

  const { type, data } = payload;

  // Handle different webhook events
  switch (type) {
    case "PAYMENT_SUCCESS_WEBHOOK":
      return await handlePaymentSuccess(data);
    
    case "PAYMENT_FAILED_WEBHOOK":
      return await handlePaymentFailed(data);
    
    case "PAYMENT_USER_DROPPED_WEBHOOK":
      return await handlePaymentDropped(data);
    
    case "REFUND_STATUS_WEBHOOK":
      return await handleRefundStatus(data);
    
    default:
      console.log(`Unhandled webhook type: ${type}`);
      return { message: "Webhook received but not processed" };
  }
};

/**
 * Handle successful payment
 */
const handlePaymentSuccess = async (data: any) => {
  const { order_id, order_amount, cf_payment_id } = data.order;
  const { payment_status, payment_amount } = data.payment;

  // Find order by cashfreeOrderId
  const order = await prisma.order.findFirst({
    where: {
      cashfreeOrderId: order_id,
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, `Order not found for Cashfree ID: ${order_id}`);
  }

  // Update order as paid
  await prisma.order.update({
    where: { id: order.id },
    data: {
      isPaid: true,
      paymentStatus: PaymentStatus.Success,
      onlineAmountPaid: payment_amount,
      paymentSessionId: cf_payment_id,
    },
  });

  console.log(`Payment successful for order ${order.orderId}: ₹${payment_amount}`);

  return {
    message: "Payment success processed",
    orderId: order.orderId,
    amount: payment_amount,
  };
};

/**
 * Handle failed payment
 */
const handlePaymentFailed = async (data: any) => {
  const { order_id } = data.order;
  const { payment_status, payment_message } = data.payment;

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      cashfreeOrderId: order_id,
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, `Order not found for Cashfree ID: ${order_id}`);
  }

  // Update order as failed
  await prisma.order.update({
    where: { id: order.id },
    data: {
      isPaid: false,
      paymentStatus: PaymentStatus.Failed,
      status: OrderStatus.Cancelled,
    },
  });

  console.log(`Payment failed for order ${order.orderId}: ${payment_message}`);

  return {
    message: "Payment failure processed",
    orderId: order.orderId,
    reason: payment_message,
  };
};

/**
 * Handle payment dropped (user closed payment page)
 */
const handlePaymentDropped = async (data: any) => {
  const { order_id } = data.order;

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      cashfreeOrderId: order_id,
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, `Order not found for Cashfree ID: ${order_id}`);
  }

  // Mark order as cancelled
  await prisma.order.update({
    where: { id: order.id },
    data: {
      isPaid: false,
      paymentStatus: PaymentStatus.Failed,
      status: OrderStatus.Cancelled,
    },
  });

  console.log(`Payment dropped for order ${order.orderId}`);

  return {
    message: "Payment dropped processed",
    orderId: order.orderId,
  };
};

/**
 * Handle refund status update
 */
const handleRefundStatus = async (data: any) => {
  const { order_id, refund_id, refund_status, refund_amount } = data.refund;

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      cashfreeOrderId: order_id,
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, `Order not found for Cashfree ID: ${order_id}`);
  }

  // Update order refund status
  if (refund_status === "SUCCESS") {
    const isFullRefund = refund_amount >= order.totalAmount;
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: isFullRefund ? PaymentStatus.Refunded : PaymentStatus.PartiallyRefunded,
      },
    });

    console.log(`Refund successful for order ${order.orderId}: ₹${refund_amount}`);
  } else if (refund_status === "FAILED") {
    console.log(`Refund failed for order ${order.orderId}`);
  }

  return {
    message: "Refund status processed",
    orderId: order.orderId,
    refundStatus: refund_status,
    refundAmount: refund_amount,
  };
};

/**
 * Verify payment status manually (for frontend to poll)
 */
const verifyPaymentStatus = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (!order.cashfreeOrderId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Not a Cashfree payment order");
  }

  // Fetch payment details from Cashfree
  const payments = await verifyCashfreePayment(order.cashfreeOrderId);

  if (payments && payments.length > 0) {
    const latestPayment = payments[0];

    // Update order based on payment status
    if (latestPayment.payment_status === "SUCCESS") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          isPaid: true,
          paymentStatus: PaymentStatus.Success,
          onlineAmountPaid: latestPayment.payment_amount,
        },
      });
    } else if (latestPayment.payment_status === "FAILED") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          isPaid: false,
          paymentStatus: PaymentStatus.Failed,
          status: OrderStatus.Cancelled,
        },
      });
    }

    return {
      paymentStatus: latestPayment.payment_status,
      amount: latestPayment.payment_amount,
      paymentMethod: latestPayment.payment_group,
    };
  }

  return {
    paymentStatus: "PENDING",
    message: "No payment details found",
  };
};

/**
 * Get payment details
 */
const getPaymentDetails = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      products: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (!order.cashfreeOrderId) {
    return {
      orderId: order.orderId,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      isPaid: order.isPaid,
      paymentStatus: order.paymentStatus,
    };
  }

  // Get Cashfree order details
  const cashfreeOrder = await getCashfreeOrderDetails(order.cashfreeOrderId);

  return {
    orderId: order.orderId,
    paymentMethod: order.paymentMethod,
    totalAmount: order.totalAmount,
    isPaid: order.isPaid,
    paymentStatus: order.paymentStatus,
    cashfreeDetails: cashfreeOrder,
  };
};

export const PaymentServices = {
  handleCashfreeWebhook,
  verifyPaymentStatus,
  getPaymentDetails,
};
