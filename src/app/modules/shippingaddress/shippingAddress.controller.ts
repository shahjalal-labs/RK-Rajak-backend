import { Request, Response } from 'express';
import {shippingAddressServices} from './shippingAddress.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const createShippingAddress = catchAsync (async (req: Request, res: Response) => {
  const result = await shippingAddressServices.createShippingAddress(req.body , req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The shippingAddress has been created successfully",
    data: result,
  });
})
 
const getMyShippingAddresss = catchAsync(async (_req: Request, res: Response) => {
  const result = await shippingAddressServices.getMyShippingAddresss(_req.user.id);
  console.log(result)
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All shippingAddresss has been retrived successfully",
    data: result,
  });
})
 
const getShippingAddressById = catchAsync(async (req: Request, res: Response) => {
  const result = await shippingAddressServices.getShippingAddressById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "shippingAddress has been retrived successfully",
    data: result,
  });
})
 
const updateShippingAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await shippingAddressServices.updateShippingAddress(req.params.id, req.body , req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "shippingAddress has been updated successfully",
    data: result,
  });
})
 
const deleteShippingAddress = catchAsync(async (req: Request, res: Response) => {
  await shippingAddressServices.deleteShippingAddress(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "shippingAddress has been deleted successfully",
  });
})
 
export const shippingAddressControllers = {
  createShippingAddress,
  getMyShippingAddresss,
  getShippingAddressById,
  updateShippingAddress,
  deleteShippingAddress,
}
  