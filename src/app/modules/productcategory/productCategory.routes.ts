import express from "express";
import { productCategoryControllers } from "./productCategory.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ProductCategorySchemaValidation } from "./productCategory.validation";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(ProductCategorySchemaValidation.createProductCategorySchema),
  productCategoryControllers.createProductCategory
);
router.get("/:branchId", auth(), productCategoryControllers.getAllProductCategorys);
router.get("/:id", auth(), productCategoryControllers.getProductCategoryById);
router.patch("/:id", auth(), productCategoryControllers.updateProductCategory);
router.delete("/:id", auth(), productCategoryControllers.deleteProductCategory);

export const productCategoryRoutes = router;