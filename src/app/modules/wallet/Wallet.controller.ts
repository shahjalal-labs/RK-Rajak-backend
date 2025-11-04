import { Request, Response } from 'express';
import {WalletServices} from './Wallet.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const rechargeBalance = catchAsync (async (req: Request, res: Response) => {
  const result = await WalletServices.rechargeBalance(req.user.id , req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Wallet has been recharged successfully",
    data: result,
  });
})
 
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
  rechargeBalance,
  getAllWallets,
  getWalletById,
}
  