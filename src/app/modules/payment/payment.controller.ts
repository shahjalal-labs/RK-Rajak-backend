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
const createDuesPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.createDuesPayment(req.body , req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Dues payment initiated successfully",
    data: result,
  });
});

/**
 * Get user dues
 */
const getUserDues = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await PaymentServices.getUserDues(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User dues retrieved successfully",
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

export const PaymentControllers = {
  createWalletRecharge,
  createDuesPayment,
  getUserDues,
  walletRechargeWebhook,
  duesPaymentWebhook,
};
