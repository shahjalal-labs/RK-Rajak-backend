import { livePhoto, PrismaClient } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToAWSS3";
import prisma from "../../../shared/prisma";

const createLivePhoto = async (
  data: livePhoto,
  categoryId: string,
  file: Express.Multer.File[]
) => {
  const isCategoryExist = await prisma.livePhotoCategory.findUnique({
    where: {
      id: categoryId,
    },
  });
  if (!isCategoryExist) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Live Photo Category does not exist"
    );
  }
  data.livePhotoCategoryId = categoryId;
  let photoUrl;
  try {
    photoUrl = await Promise.all(
      file.map(async (f) => {
        const uploaded = await uploadToDigitalOceanAWS(f);
        return uploaded.Location;
      })
    );
  } catch (error: any) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Photo upload failed");
  }

  return await prisma.livePhoto.create({ data: { ...data, photo: photoUrl , livePhotoCategoryId : categoryId } });
};

const deleteLivePhoto = async (id: string) => {
  const isExist = await prisma.livePhoto.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Live Photo does not exist");
  }
  return await prisma.livePhoto.delete({ where: { id } });
};

export const livePhotoServices = {
  createLivePhoto,
  deleteLivePhoto,
};
