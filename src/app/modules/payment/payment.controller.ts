import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PaymentServices } from "./payment.service";

/**
 * Create wallet recharge
 */
const createWalletRecharge = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.createWalletRecharge(req.body , req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Wallet recharge initiated successfully",
    data: result,
  });
});

/**
 * Create dues payment
 */
const clearDuesPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.clearDuesPayment(req.body , req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Dues payment initiated successfully",
    data: result,
  });
});

/**
 * Wallet recharge webhook handler
 */
const walletRechargeWebhook = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.handleWalletRechargeWebhook(req.body, req.headers);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Webhook processed successfully",
    data: result,
  });
});

/**
 * Dues payment webhook handler
 */
const duesPaymentWebhook = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.handleDuesPaymentWebhook(req.body, req.headers);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Webhook processed successfully",
    data: result,
  });
});

// My -Peending Payments
const getPendingPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.getPendingPayments(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Pending payments retrieved successfully",
    data: result,
  });
});

// for sales agent to get their customers pending amounts
const getSalesAgentCustomersPendingAmounts = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.getSalesAgentCustomersPendingAmounts(req.query,req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Pending payments retrieved successfully",
    data: result,
  });
});

// get single payment details
const getPaymentDetails = catchAsync(async (req: Request, res: Response) => {
  console.log("first")
  const { userId } = req.params;
  const result = await PaymentServices.getPaymentDetails(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Payment details retrieved successfully",
    data: result,
  });
});


export const PaymentControllers = {
  createWalletRecharge,
  clearDuesPayment,
  walletRechargeWebhook,
  duesPaymentWebhook,
  getPendingPayments,
  getSalesAgentCustomersPendingAmounts,
  getPaymentDetails
};
