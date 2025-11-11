import express from "express";
import { orderControllers } from "./order.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { OrderValidation } from "./order.validation";
import { UserRole } from "@prisma/client";

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
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  validateRequest(OrderValidation.cancelOrderSchema),
  orderControllers.cancelOrder
);

// Return order (partial or full)
router.post(
  "/return",
  auth(UserRole.Driver),
  validateRequest(OrderValidation.returnOrderSchema),
  orderControllers.returnOrder
);

// Get user's orders
router.get("/my-orders", auth("Customer"), orderControllers.getUserOrders);
// Get all orders (Admin)
router.get("/", auth("Owner", "SuperAdmin"), orderControllers.getAllOrders);

// Get order by ID
router.get(
  "/:id",
  auth("Customer", "Admin", "SuperAdmin"),
  orderControllers.getOrderById
);

// Update order status (Admin)
router.patch(
  "/:id/status",
  auth("Admin", "SuperAdmin"),
  validateRequest(OrderValidation.updateOrderStatusSchema),
  orderControllers.updateOrderStatus
);

// Delete order (Admin)
router.delete(
  "/:id",
  auth("Admin", "SuperAdmin"),
  orderControllers.deleteOrder
);

// ========== MainOrder Routes ==========
router.get("/main/today", auth("Customer"), orderControllers.getTodayMainOrder);

router.get(
  "/main/my-customer-orders",
  auth(UserRole.Agent),
  orderControllers.getMyCustomerOrders
);
// Get user's main orders (Customer)
router.get(
  "/main/my-orders",
  auth("Customer"),
  orderControllers.getUserMainOrders
);

// Get all main orders (Admin)
router.get(
  "/all-orders/for-owners",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  orderControllers.getAllMainOrders
);
router.get(
  "/all-dispatch/for-admin/:branchId",
  auth(UserRole.Admin),
  orderControllers.getAllDispatchOrdersByBranchId
);

// Get main order by ID
router.get("/main/:id", auth(), orderControllers.getMainOrderById);

router.post(
  "/bulk-order-by-agent",
  auth(UserRole.Agent),
  validateRequest(OrderValidation.createOrderByAgentForCustomerSchema),
  orderControllers.createOrderByAgentForCustomer
);

router.put(
  "/main/accept-orders/:mainOrderId",
  auth(UserRole.Owner, UserRole.SuperAdmin),
  // validateRequest(OrderValidation.acceptMainOrdersSchema),
  // orderControllers.acceptMainOrdersByOwner
);

router.put(
  "/main/reject-orders/:mainOrderId",
  auth(UserRole.Owner, UserRole.SuperAdmin),
  // validateRequest(OrderValidation.rejectMainOrdersSchema),
  // orderControllers.rejectMainOrdersByOwner
);

router.post("/assign-delivery-to-driver/:mainOrderId",auth(UserRole.SuperAdmin), orderControllers.assignOrdersDeliveryToDriver);

export const orderRoutes = router;
