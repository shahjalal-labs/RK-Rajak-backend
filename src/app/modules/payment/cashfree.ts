import axios from "axios";
import config from "../../../config";

// Cashfree API base URL based on environment
const CASHFREE_BASE_URL = config.cashfree.environment === "production"
  ? "https://api.cashfree.com/pg"
  : "https://sandbox.cashfree.com/pg";

// API version - must match your Cashfree credentials version
const API_VERSION = "2025-01-01";


export const createCashfreeOrder = async (payload: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
  notifyUrl?: string;
}) => {
  try {
    const requestData = {
      order_amount: payload.amount,
      order_currency: "INR",
      order_id: payload.orderId,
      customer_details: {
        customer_id: payload.customerPhone,
        customer_name: payload.customerName,
        customer_email:
          payload.customerEmail || `${payload.customerPhone}@example.com`,
        customer_phone: payload.customerPhone,
      },
      order_meta: {
        return_url: payload.returnUrl,
        notify_url:
          payload.notifyUrl ||
          `${config.backend_base_url}/api/v1/payment/webhook/cashfree`,
      },
    };

    console.log("Creating Cashfree order with request:", JSON.stringify(requestData, null, 2));
    console.log("API URL:", `${CASHFREE_BASE_URL}/orders`);
    console.log("API Version:", API_VERSION);

    const response = await axios.post(
      `${CASHFREE_BASE_URL}/orders`,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": API_VERSION,
          "x-client-id": config.cashfree.app_id,
          "x-client-secret": config.cashfree.secret_key,
        },
      }
    );

    console.log("Cashfree order created successfully:", response.data);

    return {
      order_id: response.data.order_id,
      payment_session_id: response.data.payment_session_id,
    };
  } catch (error: any) {
    console.error("Cashfree order creation error:", error.response?.data || error.message);
    throw new Error(
      `Cashfree order creation failed: ${error.response?.data?.message || error.message}`
    );
  }
};

export const verifyCashfreePayment = async (orderId: string) => {
  try {
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/orders/${orderId}/payments`,
      {
        headers: {
          "x-api-version": API_VERSION,
          "x-client-id": config.cashfree.app_id,
          "x-client-secret": config.cashfree.secret_key,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree payment verification error:", error.response?.data || error.message);
    throw new Error(
      `Cashfree payment verification failed: ${error.response?.data?.message || error.message}`
    );
  }
};

export const getCashfreeOrderDetails = async (orderId: string) => {
  try {
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/orders/${orderId}`,
      {
        headers: {
          "x-api-version": API_VERSION,
          "x-client-id": config.cashfree.app_id,
          "x-client-secret": config.cashfree.secret_key,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree fetch order error:", error.response?.data || error.message);
    throw new Error(
      `Cashfree fetch order failed: ${error.response?.data?.message || error.message}`
    );
  }
}; 

export const initiateCashfreeRefund = async (payload: {
  orderId: string;
  refundId: string;
  refundAmount: number;
  refundNote?: string;
}) => {
  const requestData = {
    refund_id: payload.refundId,
    refund_amount: payload.refundAmount,
    refund_note: payload.refundNote || "Order refund",
  };

  try {
    const response = await axios.post(
      `${CASHFREE_BASE_URL}/orders/${payload.orderId}/refunds`,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-version": API_VERSION,
          "x-client-id": config.cashfree.app_id,
          "x-client-secret": config.cashfree.secret_key,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree refund error:", error.response?.data || error.message);
    throw new Error(
      `Cashfree refund failed: ${error.response?.data?.message || error.message}`
    );
  }
};

export const getCashfreeRefundDetails = async (
  orderId: string,
  refundId: string
) => {
  try {
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/orders/${orderId}/refunds/${refundId}`,
      {
        headers: {
          "x-api-version": API_VERSION,
          "x-client-id": config.cashfree.app_id,
          "x-client-secret": config.cashfree.secret_key,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Cashfree fetch refund error:", error.response?.data || error.message);
    throw new Error(
      `Cashfree fetch refund failed: ${error.response?.data?.message || error.message}`
    );
  }
};