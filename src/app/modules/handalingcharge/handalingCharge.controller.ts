import { Request, Response } from 'express';
import {handalingChargeServices} from './handalingCharge.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const createHandalingCharge = catchAsync(async (req: Request, res: Response) => {
  const result = await handalingChargeServices.createHandalingCharge(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Handling charge created successfully",
    data: result,
  });
});
 
const getAllHandalingCharges = catchAsync(async (_req: Request, res: Response) => {
  const result = await handalingChargeServices.getAllHandalingCharges();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Handling charges retrieved successfully",
    data: result,
  });
});
 
const getHandalingChargeById = catchAsync(async (req: Request, res: Response) => {
  const result = await handalingChargeServices.getHandalingChargeById(req.params.branchId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Handling charge retrieved for branch ID successfully",
    data: result,
  });
});
 
const updateHandalingCharge = catchAsync(async (req: Request, res: Response) => {
  const result = await handalingChargeServices.updateHandalingCharge(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Handling charge updated successfully",
    data: result,
  });
});
 
const deleteHandalingCharge = catchAsync(async (req: Request, res: Response) => {
  await handalingChargeServices.deleteHandalingCharge(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Handling charge deleted successfully",
  });
});
 
export const handalingChargeControllers = {
  createHandalingCharge,
  getAllHandalingCharges,
  getHandalingChargeById,
  updateHandalingCharge,
  deleteHandalingCharge,
}
  