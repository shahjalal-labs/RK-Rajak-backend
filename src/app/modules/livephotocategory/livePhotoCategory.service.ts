import { livePhotoCategory, PrismaClient } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToDigitalOceanAWS";
const prisma = new PrismaClient();

const createLivePhotoCategory = async (
  data: livePhotoCategory,
  file: Express.Multer.File
) => {
  const isBranchExist = await prisma.branch.findUnique({
    where: {
      id: data.branchId,
    },
  });
  if (!isBranchExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Branch does not exist");
  }
  let imageUrl;
  try {
    imageUrl = (await uploadToDigitalOceanAWS(file)).Location;
  } catch (error: any) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Image upload failed");
  }
  return await prisma.livePhotoCategory.create({
    data: {
      ...data,
      image: imageUrl,
    },
  });
};

const getAllLivePhotoCategorys = async () => {
  return await prisma.livePhotoCategory.findMany();
};

const getLivePhotoCategoryById = async (id: string) => {
  return await prisma.livePhotoCategory.findUnique({ where: { id } });
};

const updateLivePhotoCategory = async (
  id: string,
  data: Partial<livePhotoCategory>,
  file: Express.Multer.File
) => {
  let imageUrl;
  if (file) {
    try {
      imageUrl = (await uploadToDigitalOceanAWS(file)).Location;
    } catch (error: any) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Image upload failed"
      );
    }
  }
  return await prisma.livePhotoCategory.update({
    where: { id },
    data: {
      ...data,
      image: imageUrl,
    },
  });
};

const deleteLivePhotoCategory = async (id: string) => {
  return await prisma.livePhotoCategory.delete({ where: { id } });
};

export const livePhotoCategoryServices = {
  createLivePhotoCategory,
  getAllLivePhotoCategorys,
  getLivePhotoCategoryById,
  updateLivePhotoCategory,
  deleteLivePhotoCategory,
};
