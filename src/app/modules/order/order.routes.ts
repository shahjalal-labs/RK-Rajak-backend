import express from "express";
import { orderControllers } from "./order.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { OrderValidation } from "./order.validation";

const router = express.Router();

// Create order (all payment methods)
router.post(
  "/",
  auth("Customer"),
  validateRequest(OrderValidation.createOrderSchema),
  orderControllers.createOrder
);

// Cancel order
router.post(
  "/cancel",
  auth("Customer"),
  validateRequest(OrderValidation.cancelOrderSchema),
  orderControllers.cancelOrder
);

// Return order (partial or full)
router.post(
  "/return",
  auth("Customer"),
  validateRequest(OrderValidation.returnOrderSchema),
  orderControllers.returnOrder
);

// Get user's orders
router.get("/my-orders", auth("Customer"), orderControllers.getUserOrders);

// Get all orders (Admin)
router.get("/", auth("Owner", "SuperAdmin"), orderControllers.getAllOrders);

// Get order by ID
router.get("/:id", auth("Customer", "Admin", "SuperAdmin"), orderControllers.getOrderById);

// Update order status (Admin)
router.patch(
  "/:id/status",
  auth("Admin", "SuperAdmin"),
  validateRequest(OrderValidation.updateOrderStatusSchema),
  orderControllers.updateOrderStatus
);

// Delete order (Admin)
router.delete("/:id", auth("Admin", "SuperAdmin"), orderControllers.deleteOrder);

export const orderRoutes = router;
