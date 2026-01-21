import { PrismaClient } from '@prisma/client';
import { uploadToDigitalOceanAWS } from '../../../helpers/uploadToAWSS3';
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';

const prisma = new PrismaClient();

interface UpsertBannerPayload {
  verticalTitle: string;
  horizontalTitles: string[];
  serialNos: number[];
  branchId: string;
  verticalBannerFile: Express.Multer.File;
  horizontalBannerFiles: Express.Multer.File[];
}

const upsertBanner = async (payload: UpsertBannerPayload) => {
  const {
    verticalTitle,
    horizontalTitles,
    serialNos,
    branchId,
    verticalBannerFile,
    horizontalBannerFiles,
  } = payload;

  // Validate branch exists
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }

  // Validate horizontal banners data
  if (horizontalBannerFiles.length !== horizontalTitles.length || 
      horizontalBannerFiles.length !== serialNos.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Number of horizontal banners, titles, and serial numbers must match'
    );
  }

  // Upload vertical banner image
  const verticalBannerUpload = await uploadToDigitalOceanAWS(verticalBannerFile);

  // Upload all horizontal banner images
  const horizontalBannerUploads = await Promise.all(
    horizontalBannerFiles.map((file) => uploadToDigitalOceanAWS(file))
  );

  // Upsert banners in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check if vertical banner exists for this branch
    const existingVerticalBanner = await tx.verticalBanner.findFirst({
      where: { branchId },
    });

    let verticalBanner;
    if (existingVerticalBanner) {
      // Update existing vertical banner
      verticalBanner = await tx.verticalBanner.update({
        where: { id: existingVerticalBanner.id },
        data: {
          title: verticalTitle,
          image: verticalBannerUpload.Location,
        },
      });
    } else {
      // Create new vertical banner
      verticalBanner = await tx.verticalBanner.create({
        data: {
          title: verticalTitle,
          image: verticalBannerUpload.Location,
          branchId,
        },
      });
    }

    // Upsert horizontal banner (create if doesn't exist)
    const horizontalBanner = await tx.horizontalBanner.upsert({
      where: { branchId },
      create: {
        branchId,
      },
      update: {},
    });

    // Delete existing horizontal banner sliders for this horizontal banner
    await tx.horizontalBannerSlider.deleteMany({
      where: { horizontalBannerId: horizontalBanner.id },
    });

    // Create new horizontal banner sliders
    const horizontalBannerSliders = await Promise.all(
      horizontalBannerUploads.map((upload, index) =>
        tx.horizontalBannerSlider.create({
          data: {
            title: horizontalTitles[index],
            image: upload.Location,
            serialNo: serialNos[index],
            horizontalBannerId: horizontalBanner.id,
          },
        })
      )
    );

    return {
      verticalBanner,
      horizontalBanner,
      horizontalBannerSliders,
    };
  });

  return result;
};


const getBannerByBranchId = async (branchId: string) => {
  // Get vertical banner
  const verticalBanner = await prisma.verticalBanner.findFirst({
    where: { branchId },
  });

  // Get horizontal banners with sliders
  const horizontalBanner = await prisma.horizontalBanner.findUnique({
    where: { branchId },
    include: {
      horizontalBannerSlider: {
        orderBy: {
          serialNo: 'asc',
        },
      },
    },
  });

  if (!verticalBanner && !horizontalBanner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No banners found for this branch');
  }

  return {
    verticalBanner: verticalBanner || null,
    horizontalBanner: horizontalBanner || null,
  };
};


export const bannerServices = {
  upsertBanner,
  getBannerByBranchId,
}
  