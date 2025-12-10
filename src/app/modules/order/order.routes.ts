import express from "express";
import { orderControllers } from "./order.controller";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { OrderValidation } from "./order.validation";
import { UserRole, User } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";

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

router.post(
  "/bulk-order-by-agent",
  auth(UserRole.Agent),
  validateRequest(OrderValidation.createOrderByAgentForCustomerSchema),
  orderControllers.createOrderByAgentForCustomer
);

/**
 * GET /api/orders/my-orders
 * Get customer's daily orders
 */
router.get(
  "/my-customer-orders",
  auth(UserRole.Agent),
  orderControllers.getMyCustomerOrders
);
router.get("/my-orders", auth("Customer"), orderControllers.getUserDailyOrders);

router.get("/superAdmin/sales-history", auth(UserRole.SuperAdmin), orderControllers.getSalesHistory);
/**
 * GET /api/orders/today
 * Get customer's today's order
 */
router.get("/today", auth("Customer"), orderControllers.getTodayOrder);

/**
 * GET /api/orders/:id
 * Get order by ID
 */
router.get("/:id", auth(), orderControllers.getOrderById);

// ========== Admin/Owner Routes ==========

/**
 * GET /api/orders/all-daily-orders
 * Get all daily orders (Admin/Owner)
 */

router.get(
  "/all-daily-orders/admin",
  (req, res, next) => {
    console.log("hit"), next();
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
  orderControllers.rejectProductByAdmin
);

//** --------------------------------SuperAdmin calculations branch and day wised  ----------------------------------- */

router.get(
  "/calculations/branchId/:branchId",
  auth(UserRole.SuperAdmin),
  orderControllers.getBranchDayWiseCalculations
);

router.post(
  "/assign-delivery-to-driver",
  auth(UserRole.SuperAdmin),
  validateRequest(OrderValidation.orderAssignToDriverSchema),
  orderControllers.assignOrdersDeliveryToDriver
);

//**------------------------------- Driver Routes----------------------------------------- */

router.get(
  "/main/driver-my-assigned-orders",
  auth(UserRole.Driver),
  orderControllers.getMyAssignedOrders
);

/**
 * PUT /api/orders/products/:orderProductId/adjust
 * Adjust product quantity during delivery (Driver)
 */
router.put(
  "/products/:orderProductId/adjust",
  auth(UserRole.Driver , UserRole.SuperAdmin, UserRole.Owner),
  validateRequest(OrderValidation.adjustProductSchema),
  orderControllers.adjustProductQuantity
);

router.get(
  "/driver/total-assigned-order-products",
  auth(UserRole.Driver),
  orderControllers.getTotalAssignedOrderProducts
);
router.get(
  "/driver/total-assigned-returned-products",
  auth(UserRole.Driver, UserRole.Agent),
  orderControllers.getTotalAssignedReturnedProducts
);
router.get(
  "/superAdmin/total-assigned-returned-products",
  auth(UserRole.SuperAdmin),
  orderControllers.getTotalAssignedReturnedProductsForSuperAdmin
);
router.get(
  "/get-orderdetails-for-driver/:orderId",
  auth(UserRole.Driver),
  orderControllers.getOrderDetailsForDriver
);
router.patch(
  "/delivered-order/:orderId",
  fileUploader.uploadSingle,
  parseBodyData,
  validateRequest(OrderValidation.MarkOrderAsDeliveredSchema),
  auth(UserRole.Driver),
  orderControllers.markOrderAsDelivered
);

/* 1.Cancel Order , 
  2. Cancel Just products , 
  3. Cancel quantity of products */

router.post(
  "/cancel-order-by-driver",
  auth(UserRole.Customer, UserRole.Driver),
  validateRequest(OrderValidation.cancelOrderSchema),
  orderControllers.cancelOrderByCustomer
);

/* 
  1. Adjust the total weight and also total price in order product 
    recalculate the main order total price , save in returnweigth , returnprice, status = partialReturned 
    recalculate order product object same as main order
    recalculate totalOrderProducts on that orderproduct 
  2. calculcate new remaining price and if he was use wallet the give back the remaining amount to wallet
*/
router.put(
  "/products/:orderProductId/return",
  auth(UserRole.Driver, UserRole.SuperAdmin, UserRole.Owner),
  validateRequest(OrderValidation.returnProductSchema),
  orderControllers.returnOrderProduct
);

export const orderRoutes = router;
