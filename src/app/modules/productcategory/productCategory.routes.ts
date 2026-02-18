import express from "express";
import { productCategoryControllers } from "./productCategory.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ProductCategorySchemaValidation } from "./productCategory.validation";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

router.post(
  "/",
  auth(),
  fileUploader.uploadSingle,
  parseBodyData,
  validateRequest(ProductCategorySchemaValidation.createProductCategorySchema),
  productCategoryControllers.createProductCategory,
);
router.post(
  "/sub-category/:categoryId",
  auth(),
  fileUploader.uploadSingle,
  parseBodyData,
  validateRequest(ProductCategorySchemaValidation.createSubcategorySchema),
  productCategoryControllers.createSubCategory,
);
router.get(
  "/buyer",
  auth(UserRole.Customer),
  productCategoryControllers.getAllProductCategorysForBuyer,
);
router.get(
  "/:branchId",
  auth(),
  productCategoryControllers.getAllProductCategorys,
);
router.get("/:id", auth(), productCategoryControllers.getProductCategoryById);
router.patch(
  "/:id",
  auth(),
  fileUploader.uploadSingle,
  parseBodyData,
  productCategoryControllers.updateProductCategory,
);
router.delete("/:id", auth(), productCategoryControllers.deleteProductCategory);
router.patch(
  "/update-status-by-category/:categoryId",
  auth(UserRole.SuperAdmin),
  productCategoryControllers.updateStatusByCategoryId,
);
router.patch(
  "/update-status-by-branch/:branchId",
  auth(UserRole.SuperAdmin),
  productCategoryControllers.updateStatusByBranchId,
);

export const productCategoryRoutes = router;
