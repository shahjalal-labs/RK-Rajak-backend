import express, { Router } from "express";
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
  auth(),
  orderControllers.getOrderById
);

// ========== Admin/Owner Routes ==========

/**
 * GET /api/orders/all-daily-orders
 * Get all daily orders (Admin/Owner)
 */

router.get(
  "/all-daily-orders/admin",
  (req,res, next)=>{
      console.log("hit"), next()
  },
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  orderControllers.getAllDailyOrders
);

/**
 * GET /api/orders/daily-summary
 * Get daily product aggregation summary
 */
router.get(
  "/daily-dispatch/admin",
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  orderControllers.getDailyDispatch
);

/**
 * PUT /api/orders/products/:orderProductId/accept
 * Accept order product (Admin/Owner)
 */
router.put(
  "/products/:totalorderProductId/accept",
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  orderControllers.acceptProduct
);

/**
 * PUT /api/orders/products/:orderProductId/reject
 * Reject order product (Admin/Owner)
 */
router.put(
  "/products/:totalorderProductId/rejectByAdmin",
  auth(UserRole.SuperAdmin, UserRole.Admin, UserRole.Owner),
  validateRequest(OrderValidation.rejectProductSchema),
  orderControllers.rejectProductByAdmin
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

//** SuperAdmin calculations branch and day wised */
router.get(
  "/calculations/branchId/:branchId",
  auth(UserRole.SuperAdmin),
  orderControllers.getBranchDayWiseCalculations
);


//** Driver Routes */

router.get(
  "/main/driver-my-assigned-orders",
  auth(UserRole.Driver),
  orderControllers.getMyAssignedOrders
);

router.post(
  "/assign-delivery-to-driver",
  auth(UserRole.SuperAdmin),
  validateRequest(OrderValidation.orderAssignToDriverSchema),
  orderControllers.assignOrdersDeliveryToDriver
);

router.get("/driver/total-assigned-order-products", auth(UserRole.Driver), orderControllers.getTotalAssignedOrderProducts);
router.get("/driver/total-assigned-returned-products", auth(UserRole.Driver), orderControllers.getTotalAssignedReturnedProducts);
router.get("/get-orderdetails-for-driver/:orderId", auth(UserRole.Driver), orderControllers.getOrderDetailsForDriver);
router.patch("/delivered-order/:orderId", validateRequest(OrderValidation.MarkOrderAsDeliveredSchema), auth(UserRole.Driver), orderControllers.markOrderAsDelivered);
export const orderRoutes = router;
