import { PrismaClient, productCategory, branch } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToAWSS3";
const prisma = new PrismaClient();

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
  });

  const productStatus =
    categories.length > 0 &&
    categories.every((category) => category.status === false)
      ? false
      : true;

  return {
    productStatus,
    categories,
  };
};

const getAllProductCategorysForBuyer = async (user: JwtPayload) => {
  const userdata = await prisma.user.findUnique({
    where: {
      id: user.id,
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

export const productCategoryServices = {
  createProductCategory,
  getAllProductCategorys,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
  getAllProductCategorysForBuyer,
  updateStatusByCategoryId,
  updateStatusByBranchId,
};
