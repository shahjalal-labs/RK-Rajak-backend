import express from "express";
import { cartValueControllers } from "./cartValue.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { CartValueSchemaValidation } from "./cartValue.validation";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.Owner, UserRole.SuperAdmin),
  validateRequest(CartValueSchemaValidation.createCartValueSchema),
  cartValueControllers.createCartValue
);

router.get(
  "/",
  auth(UserRole.Owner, UserRole.SuperAdmin),
  cartValueControllers.getAllCartValues
);

router.get("/get-by-branch/:branchId", auth(), cartValueControllers.getCartValueById);

router.patch(
  "/:id",
  auth(UserRole.Owner, UserRole.SuperAdmin),
  validateRequest(CartValueSchemaValidation.updateCartValueSchema),
  cartValueControllers.updateCartValue
);

router.delete(
  "/:id",
  auth(UserRole.Owner, UserRole.SuperAdmin),
  cartValueControllers.deleteCartValue
);

export const cartValueRoutes = router;
