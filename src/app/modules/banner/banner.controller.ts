import { Request, Response } from "express";
import { bannerServices } from "./banner.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const upsertBanner = catchAsync(async (req: Request, res: Response) => {
  // Extract files from multer
  const verticalBannerFile =
    req.files && "verticalBanner" in req.files
      ? (req.files["verticalBanner"] as Express.Multer.File[])[0]
      : undefined;
  
  const horizontalBannerFiles =
    req.files && "horizontalBanner" in req.files
      ? (req.files["horizontalBanner"] as Express.Multer.File[])
      : [];

  // Validate files
  if (!verticalBannerFile) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Vertical banner image is required"
    );
  }

  if (horizontalBannerFiles.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "At least one horizontal banner image is required"
    );
  }

  if (horizontalBannerFiles.length > 4) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Maximum 4 horizontal banner images allowed"
    );
  }

  // Extract and parse request body
  const { verticalTitle, horizontalTitles, serialNos, branchId } = req.body;

  if (!verticalTitle || !horizontalTitles || !serialNos || !branchId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "verticalTitle, horizontalTitles (array), serialNos (array), and branchId are required"
    );
  }

  // Validate arrays (already parsed by parseBodyData middleware)
  if (!Array.isArray(horizontalTitles) || !Array.isArray(serialNos)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "horizontalTitles and serialNos must be arrays"
    );
  }

  if (horizontalTitles.length !== horizontalBannerFiles.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Number of horizontal titles must match number of horizontal banner images"
    );
  }

  if (serialNos.length !== horizontalBannerFiles.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Number of serial numbers must match number of horizontal banner images"
    );
  }

  // Upsert banner
  const result = await bannerServices.upsertBanner({
    verticalTitle,
    horizontalTitles: horizontalTitles,
    serialNos: serialNos,
    branchId,
    verticalBannerFile,
    horizontalBannerFiles,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Banners saved successfully",
    data: result,
  });
});


const getBannerByBranchId = catchAsync(async (req: Request, res: Response) => {
  const result = await bannerServices.getBannerByBranchId(req.params.branchId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Banners retrieved successfully",
    data: result,
  });
});

export const bannerControllers = {
  upsertBanner,
  getBannerByBranchId,
};
