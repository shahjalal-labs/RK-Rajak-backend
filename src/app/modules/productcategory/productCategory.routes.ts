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
  productCategoryControllers.createProductCategory
);
router.get(
  "/buyer",
  auth(UserRole.Customer),
  productCategoryControllers.getAllProductCategorysForBuyer
);
router.get(
  "/:branchId",
  auth(),
  productCategoryControllers.getAllProductCategorys
);
router.get("/:id", auth(), productCategoryControllers.getProductCategoryById);
router.patch(
  "/:id",
  auth(),
  fileUploader.uploadSingle,
  parseBodyData,
  productCategoryControllers.updateProductCategory
);
router.delete("/:id", auth(), productCategoryControllers.deleteProductCategory);

export const productCategoryRoutes = router;
