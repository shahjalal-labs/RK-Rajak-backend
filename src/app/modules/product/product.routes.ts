// import express from "express";
// import { productControllers } from "./product.controller";
// import { fileUploader } from "../../../helpers/fileUploadHelper";
// import { parseBodyData } from "../../middlewares/parseBodyData";
// import validateRequest from "../../middlewares/validateRequest";
// import { ProductSchemaValidation } from "./product.validation";
// import auth from "../../middlewares/auth";
// import { UserRole } from "@prisma/client";

// const router = express.Router();
// // --------- Product Category Routes --------- //
// router.post(
//   "/categories",
//   auth(UserRole.Admin),
//   validateRequest(ProductSchemaValidation.productCategorySchema),
//   productControllers.createProductCategory
// );
// router.get("/categories", productControllers.getAllProductCategories);
// router.get("/categories/:id", productControllers.getProductCategoryById);
// router.patch("/categories/:id", productControllers.updateProductCategory);
// router.delete("/categories/:id", productControllers.deleteProductCategory);

// // -------- products brand routes -------- //
// router.get("/brands", productControllers.getAllProductBrands);
// // --------- Product Routes --------- //
// router.post(
//   "/",
//   fileUploader.uploadMultiple,
//   parseBodyData,
//   validateRequest(ProductSchemaValidation.createProductSchema),
//   productControllers.createProduct
// );
// router.get("/", productControllers.getAllProducts);
// router.get("/:id", productControllers.getProductById);
// router.patch(
//   "/:id",
//   fileUploader.uploadMultiple,
//   parseBodyData,
//   productControllers.updateProduct
// );
// router.delete("/:id", productControllers.deleteProduct);

// export const productRoutes = router;
