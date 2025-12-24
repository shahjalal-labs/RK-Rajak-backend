import { Request, Response } from 'express';
import {ownerServices} from './owner.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const getOverview = catchAsync (async (req: Request, res: Response) => {
  const result = await ownerServices.getOverview(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "The owner overview has been retrieved successfully",
    data: result,
  });
})
 
const getEarningReports = catchAsync(async (req: Request, res: Response) => {
  //filter: "daily" | "weekly" | "monthly" | "yearly";
  // dataType: "Revenue" | "Quantity" | "Orders" | "NewCustomer";
  const result = await ownerServices.getEarningReports(req.query as { filter: "daily" | "weekly" | "monthly" | "yearly"; dataType: "Revenue" | "Quantity" | "Orders" | "NewCustomer" });
  sendResponse(res, { 
    success: true,
    statusCode: 200,
    message: "The earning reports has been retrieved successfully",
    data: result,
  });
})
 
const getProductCalculations = catchAsync(async (req: Request, res: Response) => {
  const result = await ownerServices.getProductCalculations(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Product calculations have been retrieved successfully",
    data: result,
  });
})
 
const getHighestSellingProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ownerServices.getHighestSellingProducts(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "owner has been updated successfully",
    data: result,
  });
})
 
const getOverallProfit = catchAsync(async (req: Request, res: Response) => {
  const result = await ownerServices.getOverallProfit(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Overall profit has been retrieved successfully",
    data : result
  });
})
const getTonnageCalculation = catchAsync(async (req: Request, res: Response) => {
  const result = await ownerServices.getTonnageCalculation(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Tonnage calculation has been retrieved successfully",
    data : result
  });
})
 
export const ownerControllers = {
  getOverview,
  getEarningReports,
  getProductCalculations,
  getHighestSellingProducts,
  getOverallProfit,
  getTonnageCalculation
}
  