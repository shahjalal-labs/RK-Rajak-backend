import express from "express";
import { productControllers } from "./product.controller";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import validateRequest from "../../middlewares/validateRequest";
import { ProductSchemaValidation } from "./product.validation";
import auth from "../../middlewares/auth";

const router = express.Router();
router.post(
  "/",
  auth(),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(ProductSchemaValidation.createProductSchema),
  productControllers.createProduct
);
router.get("/", auth(), productControllers.getAllProducts);
router.get("/:id", auth(), productControllers.getProductById);
router.patch(
  "/:id",
  auth(),
  fileUploader.uploadMultiple,
  parseBodyData,
  productControllers.updateProduct
);
router.delete("/:id", auth(), productControllers.deleteProduct);

export const productRoutes = router;
