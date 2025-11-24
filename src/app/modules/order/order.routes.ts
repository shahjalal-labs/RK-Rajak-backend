import express from "express";
import { orderControllers } from "./order.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { OrderValidation } from "./order.validation";
import { UserRole } from "@prisma/client";

const router = express.Router();

// ========== Customer Routes ==========

/**
 * POST /api/orders
 * Create/update today's order (COD or Wallet)
 */
router.post(
  "/",
  auth("Customer"),
  validateRequest(OrderValidation.createOrderSchema),
  orderControllers.createOrder
);

/**
 * GET /api/orders/my-orders
 * Get customer's daily orders
 */
router.get("/my-orders", auth("Customer"), orderControllers.getUserDailyOrders);

/**
 * GET /api/orders/today
 * Get customer's today's order
 */
router.get("/today", auth("Customer"), orderControllers.getTodayOrder);

/**
 * GET /api/orders/:id
 * Get order by ID
 */
router.get(
  "/:id",
  auth("Customer", "Admin", "SuperAdmin", "Owner"),
  orderControllers.getOrderById
);

// ========== Admin/Owner Routes ==========

/**
 * GET /api/orders/all-daily-orders
 * Get all daily orders (Admin/Owner)
 */
router.get(
  "/all-daily-orders",
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  orderControllers.getAllDailyOrders
);

/**
 * GET /api/orders/daily-summary
 * Get daily product aggregation summary
 */
router.get(
  "/daily-summary",
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  orderControllers.getDailySummary
);

/**
 * PUT /api/orders/products/:orderProductId/accept
 * Accept order product (Admin/Owner)
 */
router.put(
  "/products/:orderProductId/accept",
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  orderControllers.acceptProduct
);

/**
 * PUT /api/orders/products/:orderProductId/reject
 * Reject order product (Admin/Owner)
 */
router.put(
  "/products/:orderProductId/reject",
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  validateRequest(OrderValidation.rejectProductSchema),
  orderControllers.rejectProduct
);

// ========== Driver Routes ==========

/**
 * PUT /api/orders/products/:orderProductId/adjust
 * Adjust product quantity during delivery (Driver)
 */
router.put(
  "/products/:orderProductId/adjust",
  auth(UserRole.Driver),
  validateRequest(OrderValidation.adjustProductSchema),
  orderControllers.adjustProductQuantity
);

export const orderRoutes = router;
