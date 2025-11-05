import config from "../config";

// Import Cashfree SDK using require (better compatibility with TypeScript)
const CashfreeSDK = require("cashfree-pg");
const { Cashfree } = CashfreeSDK;

// Initialize Cashfree SDK
Cashfree.XClientId = config.cashfree.app_id!;
Cashfree.XClientSecret = config.cashfree.secret_key!;

// Set environment - Use string values directly as the SDK may not expose Environment enum
Cashfree.XEnvironment = config.cashfree.environment === "production" 
  ? "PRODUCTION" 
  : "SANDBOX";

/**
 * Create a Cashfree order for payment
 * @param payload Order creation details
 * @returns Cashfree order response with payment session ID
 */
export const createCashfreeOrder = async (payload: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
  notifyUrl?: string;
}) => {
  const request = {
    order_id: payload.orderId,
    order_amount: payload.amount,
    order_currency: "INR",
    customer_details: {
      customer_id: payload.customerPhone,
      customer_name: payload.customerName,
      customer_email:
        payload.customerEmail || `${payload.customerPhone}@example.com`,
      customer_phone: payload.customerPhone,
    },
    order_meta: {
      return_url: payload.returnUrl,
      notify_url: payload.notifyUrl || `${config.backend_base_url}/api/payment/webhook/cashfree`,
    },
  };

  try {
    const response = await Cashfree.PGCreateOrder(
      config.cashfree.api_version,
      request
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree order creation error:", error);
    throw new Error(
      `Cashfree order creation failed: ${error.message || error}`
    );
  }
};

/**
 * Verify Cashfree payment status
 * @param orderId Cashfree order ID
 * @returns Payment details
 */
export const verifyCashfreePayment = async (orderId: string) => {
  try {
    const response = await Cashfree.PGOrderFetchPayments(
      config.cashfree.api_version,
      orderId
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree payment verification error:", error);
    throw new Error(
      `Cashfree payment verification failed: ${error.message || error}`
    );
  }
};

/**
 * Get Cashfree order details
 * @param orderId Cashfree order ID
 * @returns Order details
 */
export const getCashfreeOrderDetails = async (orderId: string) => {
  try {
    const response = await Cashfree.PGFetchOrder(
      config.cashfree.api_version,
      orderId
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree fetch order error:", error);
    throw new Error(
      `Cashfree fetch order failed: ${error.message || error}`
    );
  }
};

/**
 * Initiate refund for a Cashfree payment
 * @param payload Refund details
 * @returns Refund response
 */
export const initiateCashfreeRefund = async (payload: {
  orderId: string;
  refundId: string;
  refundAmount: number;
  refundNote?: string;
}) => {
  const request = {
    order_id: payload.orderId,
    refund_id: payload.refundId,
    refund_amount: payload.refundAmount,
    refund_note: payload.refundNote || "Order refund",
  };

  try {
    const response = await Cashfree.PGOrderCreateRefund(
      config.cashfree.api_version,
      request
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree refund error:", error);
    throw new Error(
      `Cashfree refund failed: ${error.message || error}`
    );
  }
};

/**
 * Get refund details
 * @param orderId Cashfree order ID
 * @param refundId Refund ID
 * @returns Refund details
 */
export const getCashfreeRefundDetails = async (
  orderId: string,
  refundId: string
) => {
  try {
    const response = await Cashfree.PGOrderFetchRefund(
      config.cashfree.api_version,
      orderId,
      refundId
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree fetch refund error:", error);
    throw new Error(
      `Cashfree fetch refund failed: ${error.message || error}`
    );
  }
};

export default Cashfree;
