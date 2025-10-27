import { Request, Response } from 'express';
import {livePhotoCategoryServices} from './livePhotoCategory.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const createLivePhotoCategory = catchAsync (async (req: Request, res: Response) => {
  const result = await livePhotoCategoryServices.createLivePhotoCategory(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The livePhotoCategory has been created successfully",
    data: result,
  });
})
 
const getAllLivePhotoCategorys = catchAsync(async (_req: Request, res: Response) => {
  const result = await livePhotoCategoryServices.getAllLivePhotoCategorys();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All livePhotoCategorys has been retrived successfully",
    data: result,
  });
})
 
const getLivePhotoCategoryById = catchAsync(async (req: Request, res: Response) => {
  const result = await livePhotoCategoryServices.getLivePhotoCategoryById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "livePhotoCategory has been retrived successfully",
    data: result,
  });
})
 
const updateLivePhotoCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await livePhotoCategoryServices.updateLivePhotoCategory(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "livePhotoCategory has been updated successfully",
    data: result,
  });
})
 
const deleteLivePhotoCategory = catchAsync(async (req: Request, res: Response) => {
  await livePhotoCategoryServices.deleteLivePhotoCategory(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "livePhotoCategory has been deleted successfully",
  });
})
 
export const livePhotoCategoryControllers = {
  createLivePhotoCategory,
  getAllLivePhotoCategorys,
  getLivePhotoCategoryById,
  updateLivePhotoCategory,
  deleteLivePhotoCategory,
}
  