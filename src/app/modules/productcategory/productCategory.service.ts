import { productCategory } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToAWSS3";
import prisma from "../../../shared/prisma";
import { skip } from "@prisma/client/runtime/library";

const createProductCategory = async (
  data: productCategory,
  file?: Express.Multer.File,
) => {
  let imageUrl = "";
  if (file) {
    try {
      imageUrl = (await uploadToDigitalOceanAWS(file)).Location;
    } catch (error: any) {
      throw new ApiError(httpStatus.BAD_REQUEST, error.message);
    }
  }

  const isBranchExist = await prisma.branch.findUnique({
    where: { id: data.branchId },
  });
  if (!isBranchExist) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Branch id is invalid. please provide a valid branch id",
    );
  }
  return await prisma.productCategory.create({
    data: { ...data, image: imageUrl },
  });
};

const createSubCategory = async (
  categoryId: string,
  data: { name: string },
  file: Express.Multer.File,
) => {
  const isCategoryExist = await prisma.productCategory.findUnique({
    where: { id: categoryId },
  });
  if (!isCategoryExist)
    throw new ApiError(httpStatus.BAD_REQUEST, "Category id is invalid");

  if (file === undefined)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Image file is required for subcategory",
    );

  const imageUrl = (await uploadToDigitalOceanAWS(file)).Location;

  await prisma.productSubcategory.create({
    data: {
      productCategoryId: categoryId,
      name: data.name,
      image: imageUrl,
    },
  });
  return;
};

const getAllProductCategorys = async (branchId: string) => {
  const isBranchExist = await prisma.branch.findUnique({
    where: { id: branchId },
  });
  if (!isBranchExist) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Branch id is invalid. please provide a valid branch id",
    );
  }
  const categories = await prisma.productCategory.findMany({
    where: { branchId },
    include: {
      productSubcategory: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return {
    categories,
  };
};

const getAllProductCategorysForBuyer = async (userId: string) => {
  const userdata = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  const branchId = userdata?.branchId as string;

  if (!branchId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Your account is not associated with any branch",
    );
  }
  return await prisma.productCategory.findMany({
    where: { branchId },
  });
};

const getProductCategoryById = async (id: string) => {
  const res = await prisma.productCategory.findUnique({ where: { id } });
  if (!res) {
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
};

const updateProductCategory = async (
  id: string,
  data: Partial<productCategory>,
  file?: Express.Multer.File,
) => {
  let imageUrl = "";

  const isExist = await prisma.productCategory.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }

  if (file) {
    try {
      imageUrl = (await uploadToDigitalOceanAWS(file)).Location;
    } catch (error: any) {
      throw new ApiError(httpStatus.BAD_REQUEST, error.message);
    }
  }

  return await prisma.productCategory.update({
    where: { id },
    data: { ...data, image: imageUrl ?? isExist.image },
  });
};

const deleteProductCategory = async (id: string) => {
  const isExist = await prisma.productCategory.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
  return await prisma.productCategory.delete({ where: { id } });
};

const updateStatusByCategoryId = async (
  categoryId: string,
  status: boolean,
) => {
  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category) throw new ApiError(404, "Category not found");

  await prisma.productCategory.update({
    where: { id: categoryId },
    data: { status },
  });

  return;
};

const updateStatusByBranchId = async (branchId: string, status: boolean) => {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });
  if (!branch) throw new ApiError(404, "Branch not found");

  await prisma.productCategory.updateMany({
    where: { branchId },
    data: { status },
  });

  return;
};

const addCategoriesToQueryList = async (
  branchId: string,
  categoryIds: string[],
) => {
  // 1️⃣ Get existing categoryIds for branch
  const existing = await prisma.queryList.findMany({
    where: { branchId },
    select: { categoryId: true },
  });

  const existingIds = new Set(existing.map((e) => e.categoryId));

  // 2️⃣ Filter out duplicates
  const newCategoryIds = categoryIds.filter((id) => !existingIds.has(id));

  if (newCategoryIds.length === 0) return;

  // 3️⃣ Insert only new ones
  await prisma.queryList.createMany({
    data: newCategoryIds.map((categoryId) => ({
      branchId,
      categoryId,
    })),
  });
};

const getQueryList = async (branchId: string) => {
  return await prisma.queryList.findMany({
    where: { branchId },
    select: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

const getSubcategories = async (categoryId: string) => {
  return await prisma.productSubcategory.findMany({
    where: { productCategoryId: categoryId },
    select: {
      id: true,
      name: true,
    },
  });
};

export const productCategoryServices = {
  createProductCategory,
  createSubCategory,
  getAllProductCategorys,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
  getAllProductCategorysForBuyer,
  updateStatusByCategoryId,
  updateStatusByBranchId,
  addCategoriesToQueryList,
  getQueryList,
  getSubcategories,
};
