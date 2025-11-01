import { Request, Response } from 'express';
import {productCategoryServices} from './productCategory.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';
 
const createProductCategory = catchAsync (async (req: Request, res: Response) => {
  const result = await productCategoryServices.createProductCategory(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The productCategory has been created successfully",
    data: result,
  });
})

const getAllProductCategorys = catchAsync(async (_req: Request, res: Response) => {
  const branchId = _req.params.branchId;
  if(!branchId){
    throw new ApiError(httpStatus.BAD_REQUEST,"Branch id is required");
  }
  const result = await productCategoryServices.getAllProductCategorys(branchId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All productCategorys has been retrived successfully",
    data: result,
  });
})
const getAllProductCategorysForBuyer = catchAsync(async (_req: Request, res: Response) => {
  const result = await productCategoryServices.getAllProductCategorysForBuyer(_req.user);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All productCategorys has been retrived successfully",
    data: result,
  });
})
 
const getProductCategoryById = catchAsync(async (req: Request, res: Response) => {
  const result = await productCategoryServices.getProductCategoryById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "productCategory has been retrived successfully",
    data: result,
  });
})
 
const updateProductCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await productCategoryServices.updateProductCategory(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "productCategory has been updated successfully",
    data: result,
  });
})
 
const deleteProductCategory = catchAsync(async (req: Request, res: Response) => {
  await productCategoryServices.deleteProductCategory(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "productCategory has been deleted successfully",
  });
})
 
export const productCategoryControllers = {
  createProductCategory,
  getAllProductCategorys,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
  getAllProductCategorysForBuyer
}
  