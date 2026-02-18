import { productCategoryServices } from "./productCategory.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createProductCategory = catchAsync(async (req, res) => {
  const file = req.file;
  const result = await productCategoryServices.createProductCategory(
    req.body,
    file,
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The productCategory has been created successfully",
    data: result,
  });
});

const createSubCategory = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File;
  const result = await productCategoryServices.createSubCategory(
    req.params.categoryId,
    req.body,
    file,
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The productSubcategory has been created successfully",
    data: result,
  });
});

const getAllProductCategorys = catchAsync(async (req, res) => {
  const branchId = req.params.branchId;
  if (!branchId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Branch id is required");
  }
  const result = await productCategoryServices.getAllProductCategorys(branchId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All productCategorys has been retrived successfully",
    data: result,
  });
});

const getAllProductCategorysForBuyer = catchAsync(async (req, res) => {
  const { id } = req.user;
  const result =
    await productCategoryServices.getAllProductCategorysForBuyer(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All productCategorys has been retrived successfully",
    data: result,
  });
});

const getProductCategoryById = catchAsync(async (req, res) => {
  const result = await productCategoryServices.getProductCategoryById(
    req.params.id,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "productCategory has been retrived successfully",
    data: result,
  });
});

const updateProductCategory = catchAsync(async (req, res) => {
  const file = req.file;
  const result = await productCategoryServices.updateProductCategory(
    req.params.id,
    req.body,
    file,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "productCategory has been updated successfully",
    data: result,
  });
});

const deleteProductCategory = catchAsync(async (req, res) => {
  await productCategoryServices.deleteProductCategory(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "productCategory has been deleted successfully",
  });
});

const updateStatusByCategoryId = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const { status } = req.body;
  await productCategoryServices.updateStatusByCategoryId(categoryId, status);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Category status has been updated successfully",
  });
});

const updateStatusByBranchId = catchAsync(async (req, res) => {
  const { branchId } = req.params;
  const { status } = req.body;
  await productCategoryServices.updateStatusByBranchId(branchId, status);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "ProductCategories status has been updated successfully",
  });
});

const addCategoriesToQueryList = catchAsync(async (req, res) => {
  const { branchId } = req.params;
  const { categoryIds } = req.body;
  await productCategoryServices.addCategoriesToQueryList(branchId, categoryIds);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "ProductCategories has been added to query list successfully",
  });
});

const getQueryList = catchAsync(async (req, res) => {
  const { branchId } = req.params;
  const result = await productCategoryServices.getQueryList(branchId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message:
      "ProductCategories has been retrieved from query list successfully",
    data: result,
  });
});

const getSubcategories = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const result = await productCategoryServices.getSubcategories(categoryId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Subcategories has been retrieved successfully",
    data: result,
  });
});

export const productCategoryControllers = {
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
