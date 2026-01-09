import { Request, Response } from "express";
import { livePhotoServices } from "./livePhoto.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createLivePhoto = catchAsync(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const livePhotoFiles =
    req.files && "livePhoto" in req.files
      ? (req.files["livePhoto"] as Express.Multer.File[])
      : [];
  if (!livePhotoFiles || livePhotoFiles.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Live photo file is required");
  }
  const result = await livePhotoServices.createLivePhoto(req.body , categoryId, livePhotoFiles);
  sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "The livePhoto has been created successfully",
      data: result,
    });
  });

  const deleteLivePhoto = catchAsync(async (req: Request, res: Response) => {
  await livePhotoServices.deleteLivePhoto(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "livePhoto has been deleted successfully",
  });
});

export const livePhotoControllers = {
  createLivePhoto,
  deleteLivePhoto,
};
