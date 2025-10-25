import express from "express";
import { shippingAddressControllers } from "./shippingAddress.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ShippingAddressSchemaValidation } from "./shippingAddress.validation";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post(
  "/",
  auth(),
  validateRequest(ShippingAddressSchemaValidation.createShippingAddressSchema),
  shippingAddressControllers.createShippingAddress
);
router.get("/", auth(), shippingAddressControllers.getMyShippingAddresss);
router.get("/:id", auth(), shippingAddressControllers.getShippingAddressById);
router.patch("/:id", auth(), shippingAddressControllers.updateShippingAddress);
router.delete("/:id", auth(), shippingAddressControllers.deleteShippingAddress);

export const shippingAddressRoutes = router;
