import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PaymentServices } from "./payment.service";

/**
 * Cashfree webhook handler
 * This endpoint receives payment status updates from Cashfree
 */
const cashfreeWebhook = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.handleCashfreeWebhook(req.body, req.headers);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Webhook processed successfully",
    data: result,
  });
});

/**
 * Verify payment status manually (for frontend polling)
 */
const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const result = await PaymentServices.verifyPaymentStatus(orderId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Payment status verified",
    data: result,
  });
});

/**
 * Get payment details
 */
const getPaymentDetails = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const result = await PaymentServices.getPaymentDetails(orderId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Payment details retrieved successfully",
    data: result,
  });
});

export const PaymentControllers = {
  cashfreeWebhook,
  verifyPayment,
  getPaymentDetails,
};
