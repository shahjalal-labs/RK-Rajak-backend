import { handalingCharge, PrismaClient } from '@prisma/client';
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';
const prisma = new PrismaClient();

const createHandalingCharge = async (data: handalingCharge) => {
  // Validate branch exists
  const branch = await prisma.branch.findUnique({
    where: { id: data.branchId as string },
  });

  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, "Branch not found");
  }

  // Check if handling charge already exists for this branch
  const isExistForThisBranch = await prisma.handalingCharge.findFirst({
    where: { branchId: data.branchId },
  });

  if (isExistForThisBranch) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Handling charge for this branch already exists. Please update the existing one"
    );
  }

  return await prisma.handalingCharge.create({
    data,
    include: {
      branch: true,
    },
  });
};

const getAllHandalingCharges = async () => {
  return await prisma.handalingCharge.findMany({
    include: {
      branch: true,
    },
  });
};

const getHandalingChargeById = async (branchId: string) => {
  const handalingCharge = await prisma.handalingCharge.findFirst({
    where: { branchId },
    include: {
      branch: true,
    },
  });

  if (!handalingCharge) {
    throw new ApiError(httpStatus.NOT_FOUND, "Handling charge not found for this branch");
  }

  return handalingCharge;
};

const updateHandalingCharge = async (id: string, data: Partial<handalingCharge>) => {
  // Check if handling charge exists
  console.log(id)
  const handalingCharge = await prisma.handalingCharge.findUnique({
    where: { id },
  });

  if (!handalingCharge) {
    throw new ApiError(httpStatus.NOT_FOUND, "Handling charge not found");
  }

  // If updating branchId, validate new branch exists
  if (data.branchId && data.branchId !== handalingCharge.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: data.branchId },
    });

    if (!branch) {
      throw new ApiError(httpStatus.NOT_FOUND, "Branch not found");
    }

    // Check if another handling charge already exists for the new branch
    const existingForBranch = await prisma.handalingCharge.findFirst({
      where: {
        branchId: data.branchId,
        id: { not: id },
      },
    });

    if (existingForBranch) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Handling charge already exists for this branch"
      );
    }
  }

  return await prisma.handalingCharge.update({
    where: { id },
    data,
    include: {
      branch: true,
    },
  });
};

const deleteHandalingCharge = async (id: string) => {
  const handalingCharge = await prisma.handalingCharge.findUnique({
    where: { id },
  });

  if (!handalingCharge) {
    throw new ApiError(httpStatus.NOT_FOUND, "Handling charge not found");
  }

  return await prisma.handalingCharge.delete({
    where: { id },
  });
};

export const handalingChargeServices = {
  createHandalingCharge,
  getAllHandalingCharges,
  getHandalingChargeById,
  updateHandalingCharge,
  deleteHandalingCharge,
}
  