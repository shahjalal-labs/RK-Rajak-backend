import { Request, Response } from "express";
import { orderServices } from "./order.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";

/**
 * Create order (handles all payment methods)
 */
const createOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id; // Assuming auth middleware adds user to request
  const result = await orderServices.createOrder({ ...req.body, userId });

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Order created successfully",
    data: result,
  });
});
const createOrderByAgentForCustomer = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id; // Assuming auth middleware adds user to request
    const result = await orderServices.createOrderByAgentForCustomer({
      ...req.body,
      userId,
    });

    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "Order created successfully",
      data: result,
    });
  }
);

/**
 * Cancel order
 */
const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { orderId, reason } = req.body;

  const result = await orderServices.cancelOrder({
    orderId,
    userId,
    reason,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Order cancelled successfully",
    data: result,
  });
});

/**
 * Return order (partial or full)
 */
const returnOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { orderId, products, reason } = req.body;

  const result = await orderServices.returnOrder({
    orderId,
    userId,
    products,
    reason,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Order returned successfully",
    data: result,
  });
});

/**
 * Get all orders
 */
const getAllOrders = catchAsync(async (_req: Request, res: Response) => {
  const result = await orderServices.getAllOrders();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All orders retrieved successfully",
    data: result,
  });
});

/**
 * Get order by ID
 */
const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await orderServices.getOrderById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Order retrieved successfully",
    data: result,
  });
});

/**
 * Get user's orders
 */
const getUserOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await orderServices.getUserOrders(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User orders retrieved successfully",
    data: result,
  });
});

/**
 * Update order status
 */
const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.body;
  const result = await orderServices.updateOrderStatus(req.params.id, status);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Order status updated successfully",
    data: result,
  });
});

/**
 * Delete order (soft delete)
 */
const deleteOrder = catchAsync(async (req: Request, res: Response) => {
  await orderServices.deleteOrder(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Order deleted successfully",
  });
});

/**
 * Get all MainOrders (for admin)
 */
const getAllMainOrders = catchAsync(async (_req: Request, res: Response) => {
  const result = await orderServices.getAllMainOrders();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All main orders retrieved successfully",
    data: result,
  });
});

/**
 * Get MainOrder by ID
 */
const getMainOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await orderServices.getMainOrderById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Main order retrieved successfully",
    data: result,
  });
});
const getMyCustomerOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await orderServices.getMyCustomerOrders(
    req.user.id,
    req.query
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Agent Cusotmer orders retrieved successfully",
    data: result,
  });
});

/**
 * Get user's MainOrders
 */
const getUserMainOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const queryParams = req.query;
  const result = await orderServices.getUserMainOrders(userId, queryParams);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User main orders retrieved successfully",
    data: result,
  });
});

const getAllDispatchOrdersByBranchId = catchAsync(
  async (req: Request, res: Response) => {
    const branchId = req.params.branchId;
    const queryParams = {
      ...req.query,
      branchId,
    } as any;
    const result = await orderServices.getAllDispatchOrdersByBranchId(
      queryParams
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "All dispatch orders retrieved successfully",
      data: result,
    });
  }
);

/**
 * Get today's MainOrder for logged-in user
 */
const getTodayMainOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await orderServices.getTodayMainOrder(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: result
      ? "Today's main order retrieved successfully"
      : "No orders placed today",
    data: result,
  });
});

///------------------- Assign Delivery to Driver -----------------///
const assignOrdersDeliveryToDriver = catchAsync(
  async (req: Request, res: Response) => {
    const result = await orderServices.assignOrdersDeliveryToDriver(req.body);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Delivery assigned to driver successfully",
      data: result,
    });
  }
);

export const orderControllers = {
  createOrder,
  cancelOrder,
  returnOrder,
  getAllOrders,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  deleteOrder,
  // MainOrder controllers
  getAllMainOrders,
  getMainOrderById,
  getUserMainOrders,
  getTodayMainOrder,
  getMyCustomerOrders,
  createOrderByAgentForCustomer,
  getAllDispatchOrdersByBranchId,
  assignOrdersDeliveryToDriver,
};
