import { Request, Response } from 'express';
import {livePhotoServices} from './livePhoto.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const createLivePhoto = catchAsync (async (req: Request, res: Response) => {
  const result = await livePhotoServices.createLivePhoto(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The livePhoto has been created successfully",
    data: result,
  });
})
 
const getAllLivePhotos = catchAsync(async (_req: Request, res: Response) => {
  const result = await livePhotoServices.getAllLivePhotos();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All livePhotos has been retrived successfully",
    data: result,
  });
})
 
const getLivePhotoById = catchAsync(async (req: Request, res: Response) => {
  const result = await livePhotoServices.getLivePhotoById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "livePhoto has been retrived successfully",
    data: result,
  });
})
 
const updateLivePhoto = catchAsync(async (req: Request, res: Response) => {
  const result = await livePhotoServices.updateLivePhoto(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "livePhoto has been updated successfully",
    data: result,
  });
})
 
const deleteLivePhoto = catchAsync(async (req: Request, res: Response) => {
  await livePhotoServices.deleteLivePhoto(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "livePhoto has been deleted successfully",
  });
})
 
export const livePhotoControllers = {
  createLivePhoto,
  getAllLivePhotos,
  getLivePhotoById,
  updateLivePhoto,
  deleteLivePhoto,
}
  