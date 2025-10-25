// import { Request, Response } from "express";
// import { productServices } from "./product.service";
// import sendResponse from "../../../shared/sendResponse";
// import catchAsync from "../../../shared/catchAsync";

// // ------------ product category controllers -------------
// const createProductCategory = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await productServices.createProductCategory(req.body);
//     sendResponse(res, {
//       success: true,
//       statusCode: 201,
//       message: "The product category has been created successfully",
//       data: result,
//     });
//   }
// );
// const deleteProductCategory = catchAsync(
//   async (req: Request, res: Response) => {
//     await productServices.deleteProductCategory(req.params.id);
//     sendResponse(res, {
//       success: true,
//       statusCode: 201,
//       message: "The product category has been deleted successfully",
//     });
//   }
// );
// const getAllProductCategories = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await productServices.getAllProductCategories();
//     sendResponse(res, {
//       success: true,
//       statusCode: 201,
//       message: "product has been retrieved successfully",
//       data: result,
//     });
//   }
// );
// const getProductCategoryById = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await productServices.getProductCategoryById(req.params.id);
//     sendResponse(res, {
//       success: true,
//       statusCode: 201,
//       message: "product category has been retrieved successfully",
//       data: result,
//     });
//   }
// );
// const updateProductCategory = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await productServices.updateProductCategory(
//       req.params.id,
//       req.body
//     );
//     sendResponse(res, {
//       success: true,
//       statusCode: 201,
//       message: "The product category has been updated successfully",
//       data: result,
//     });
//   }
// );

// // --------product brand controllers -------- //
// const getAllProductBrands = catchAsync(async (req: Request, res: Response) => {
//   const result = await productServices.getAllProductBrands();
//   sendResponse(res, {
//     success: true,
//     statusCode: 201,
//     message: "The product brand has been retrieved successfully",
//     data: result,
//   });
// });
// // ------------ product controllers -------------
// const createProduct = catchAsync(async (req: Request, res: Response) => {
//   const productImages =
//     req.files &&
//     (req.files as { [fieldname: string]: Express.Multer.File[] })[
//       "productImages"
//     ];
//   if (!productImages) {
//     throw new Error("Product images are required");
//   }
//   const result = await productServices.createProduct(req.body, productImages);
//   sendResponse(res, {
//     success: true,
//     statusCode: 201,
//     message: "The product has been created successfully",
//     data: result,
//   });
// });
// const getAllProducts = catchAsync(async (_req: Request, res: Response) => {
//   const result = await productServices.getAllProducts(_req.query);
//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "All products has been retrived successfully",
//     data: result,
//   });
// });
// const bestSelling = catchAsync(async (_req: Request, res: Response) => {
//   const result = await productServices.bestSelling();
//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "best selling products has been retrived successfully",
//     data: result,
//   });
// });

// const getProductById = catchAsync(async (req: Request, res: Response) => {
//   const result = await productServices.getProductById(req.params.id);
//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "product has been retrived successfully",
//     data: result,
//   });
// });

// const updateProduct = catchAsync(async (req: Request, res: Response) => {
//   const productImages =
//     req.files &&
//     (req.files as { [fieldname: string]: Express.Multer.File[] })[
//       "productImages"
//     ];
//   if (!productImages) {
//     throw new Error("Product images are required");
//   }
//   const result = await productServices.updateProduct(req.params.id, req.body , productImages);
//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "product has been updated successfully",
//     data: result,
//   });
// });

// const deleteProduct = catchAsync(async (req: Request, res: Response) => {
//   await productServices.deleteProduct(req.params.id);
//   sendResponse(res, {
//     success: true,
//     statusCode: 200,
//     message: "product has been deleted successfully",
//   });
// });

// export const productControllers = {
//   createProduct,
//   getAllProducts,
//   getProductById,
//   updateProduct,
//   deleteProduct,
//   deleteProductCategory,
//   updateProductCategory,
//   getProductCategoryById,
//   getAllProductCategories,
//   createProductCategory,
//   getAllProductBrands,
//   bestSelling
// };
