import { Request, Response } from 'express';
import {WalletServices} from './Wallet.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";

// NOTE: Wallet recharge is now handled by Payment module
// Use POST /payment/wallet/recharge endpoint for recharging wallet
 
const getAllWallets = catchAsync(async (_req: Request, res: Response) => {
  const result = await WalletServices.getAllWallets();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All Wallets has been retrived successfully",
    data: result,
  });
})
 
const getWalletById = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.getWalletById(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Wallet has been retrieved successfully",
    data: result,
  });
})
  
export const WalletControllers = {
  getAllWallets,
  getWalletById,
}
  