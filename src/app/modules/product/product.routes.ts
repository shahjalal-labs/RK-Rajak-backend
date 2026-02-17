import express from "express";
import { productControllers } from "./product.controller";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import validateRequest from "../../middlewares/validateRequest";
import { ProductSchemaValidation } from "./product.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();
router.post(
  "/",
  auth(),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(ProductSchemaValidation.createProductSchema),
  productControllers.createProduct,
);
router.get("/highestSellingProducts", auth(), productControllers.bestSelling);
router.get("/for-buyer", auth(), productControllers.getAllProductsForBuyer);
router.get("/:branchId", auth(), productControllers.getAllProducts);
router.get("/details/:id", auth(), productControllers.getProductById);
router.patch(
  "/:id",
  auth(),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(ProductSchemaValidation.updateProductSchema),
  productControllers.updateProduct,
);
router.delete("/:id", auth(), productControllers.deleteProduct);

export const productRoutes = router;
