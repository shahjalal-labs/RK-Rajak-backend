import { Request, Response } from 'express';
import {spinServices} from './spin.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const setupSpinValues = catchAsync (async (req: Request, res: Response) => {
  const result = await spinServices.setupSpinValues(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The spin has been setup successfully",
    data: result,
  });
})
const rechargeBySpin = catchAsync (async (req: Request, res: Response) => {
  const result = await spinServices.rechargeBySpins(req.user.id,req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The spin has been recharged successfully",
    data: result,
  });
})
 
const getCurrentMonthSpinValuesForcustomer = catchAsync(async (_req: Request, res: Response) => {
  const result = await spinServices.getCurrentMonthSpinValuesForcustomer(_req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Current month spins has been retrived successfully",
    data: result,
  });
})
const getCurrentMonthSpinValuesForAdmins = catchAsync(async (_req: Request, res: Response) => {
  if(!_req.params.branchId){
    throw new Error(" Branch id is required");
  }
  const result = await spinServices.getCurrentMonthSpinValuesForAdmins(_req.params.branchId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Current month spins has been retrived successfully",
    data: result,
  });
})
 
const getSpinById = catchAsync(async (req: Request, res: Response) => {
  const result = await spinServices.getSpinById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "spin has been retrived successfully",
    data: result,
  });
})
 
const updateSpin = catchAsync(async (req: Request, res: Response) => {
  const result = await spinServices.updateSpin(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "spin has been updated successfully",
    data: result,
  });
})
 
const deleteSpin = catchAsync(async (req: Request, res: Response) => {
  await spinServices.deleteSpin(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "spin has been deleted successfully",
  });
})
 
export const spinControllers = {
  setupSpinValues,
  getCurrentMonthSpinValuesForcustomer,
  getCurrentMonthSpinValuesForAdmins,
  getSpinById,
  updateSpin,
  deleteSpin,
  rechargeBySpin
}
  