import { Request, Response } from 'express';
import {cartValueServices} from './cartValue.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const createCartValue = catchAsync(async (req: Request, res: Response) => {
  const result = await cartValueServices.createCartValue(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Cart value created successfully",
    data: result,
  });
});
 
const getAllCartValues = catchAsync(async (_req: Request, res: Response) => {
  const result = await cartValueServices.getAllCartValues();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cart values retrieved successfully",
    data: result,
  });
});
 
const getCartValueById = catchAsync(async (req: Request, res: Response) => {
  const result = await cartValueServices.getCartValueById(req.params.branchId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cart value retrieved successfully",
    data: result,
  });
});
 
const updateCartValue = catchAsync(async (req: Request, res: Response) => {
  const result = await cartValueServices.updateCartValue(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cart value updated successfully",
    data: result,
  });
});

const deleteCartValue = catchAsync(async (req: Request, res: Response) => {
  await cartValueServices.deleteCartValue(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cart value deleted successfully",
  });
});
 
export const cartValueControllers = {
  createCartValue,
  getAllCartValues,
  getCartValueById,
  updateCartValue,
  deleteCartValue,
}
  