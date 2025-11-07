import { cartValue, PrismaClient } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
const prisma = new PrismaClient();

const createCartValue = async (data: cartValue) => {
  // Validate branch exists
  const branch = await prisma.branch.findUnique({
    where: { id: data.branchId as string },
  });

  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, "Branch not found");
  }

  // Check if cart value already exists for this branch
  const isExistForThisBranch = await prisma.cartValue.findFirst({
    where: { branchId: data.branchId },
  });

  if (isExistForThisBranch) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Cart value for this branch already exists. Please update the existing one"
    );
  }

  return await prisma.cartValue.create({
    data,
    include: {
      branch: true,
    },
  });
};

const getAllCartValues = async () => {
  return await prisma.cartValue.findMany({
    include: {
      branch: true,
    },
  });
};

const getCartValueById = async (branchId: string) => {
  const isBranchExist = await prisma.branch.findUnique({
    where: { id: branchId },
  });
  if (!isBranchExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Branch not found");
  }
  const cartValue = await prisma.cartValue.findFirst({
    where: { branchId: branchId },
    include: {
      branch: true,
    },
  });

  if (!cartValue) {
    throw new ApiError(httpStatus.NOT_FOUND, "there are no cart value for this branch");
  }

  return cartValue;
};

const updateCartValue = async (id: string, data: Partial<cartValue>) => {
  // Check if cart value exists
  const cartValue = await prisma.cartValue.findUnique({
    where: { id },
  });

  if (!cartValue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Cart value not found");
  }

  // If updating branchId, validate new branch exists
  if (data.branchId && data.branchId !== cartValue.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: data.branchId },
    });

    if (!branch) {
      throw new ApiError(httpStatus.NOT_FOUND, "Branch not found");
    }

    // Check if another cart value already exists for the new branch
    const existingForBranch = await prisma.cartValue.findFirst({
      where: {
        branchId: data.branchId,
        id: { not: id },
      },
    });

    if (existingForBranch) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Cart value already exists for this branch"
      );
    }
  }

  return await prisma.cartValue.update({
    where: { id },
    data,
    include: {
      branch: true,
    },
  });
};

const deleteCartValue = async (id: string) => {
  const cartValue = await prisma.cartValue.findUnique({
    where: { id },
  });

  if (!cartValue) {
    throw new ApiError(httpStatus.NOT_FOUND, "Cart value not found");
  }

  return await prisma.cartValue.delete({
    where: { id },
  });
};

export const cartValueServices = {
  createCartValue,
  getAllCartValues,
  getCartValueById,
  updateCartValue,
  deleteCartValue,
};
