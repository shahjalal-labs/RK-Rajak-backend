import { Request, Response } from "express";
import { productServices } from "./product.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const productImages =
    req.files &&
    (req.files as { [fieldname: string]: Express.Multer.File[] })[
      "productImages"
    ];
  if (!productImages) {
    throw new Error("Product images are required");
  }
  const result = await productServices.createProduct(req.body, productImages);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The product has been created successfully",
    data: result,
  });
});
const getAllProducts = catchAsync(async (_req: Request, res: Response) => {
  const result = await productServices.getAllProducts(_req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All products has been retrived successfully",
    data: result,
  });
});
const bestSelling = catchAsync(async (_req: Request, res: Response) => {
  const result = await productServices.bestSelling();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "best selling products has been retrived successfully",
    data: result,
  });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.getProductById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "product has been retrived successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const productImages =
    req.files &&
    (req.files as { [fieldname: string]: Express.Multer.File[] })[
      "productImages"
    ];
  if (!productImages) {
    throw new Error("Product images are required");
  }
  const result = await productServices.updateProduct(req.params.id, req.body , productImages);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "product has been updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await productServices.deleteProduct(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "product has been deleted successfully",
  });
});

export const productControllers = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bestSelling
};
