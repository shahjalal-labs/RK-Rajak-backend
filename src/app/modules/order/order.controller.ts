import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { orderServices } from "./order.service";
import httpStatus from "http-status";

/**
 * Create order (handles COD and Wallet)
 */
const createOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await orderServices.createOrder({ ...req.body, userId });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Order created/updated successfully",
    data: result,
  });
});

/**
 * Get user's daily orders
 */
const getUserDailyOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await orderServices.getUserDailyOrders(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Daily orders retrieved successfully",
    data: result,
  });
});

/**
 * Get today's order for logged-in user
 */
const getTodayOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await orderServices.getTodayOrder(userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result
      ? "Today's order retrieved successfully"
      : "No order found for today",
    data: result,
  });
});

/**
 * Get all daily orders (Admin/Owner)
 */
const getAllDailyOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await orderServices.getAllDailyOrders(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "All daily orders retrieved successfully",
    data: result,
  });
});

/**
 * Get daily product summary (Admin/Owner)
 */
const getDailyDispatch = catchAsync(async (req: Request, res: Response) => {
  const result = await orderServices.getDailyDispatch(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Daily product Dispatch retrieved successfully",
    data: result,
  });
});

/**
 * Accept order product (Admin/Owner)
 */
const acceptProduct = catchAsync(async (req: Request, res: Response) => {
  const { orderProductId } = req.params;
  const userId = req.user.id;
  const result = await orderServices.acceptProduct(orderProductId, userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product accepted successfully",
    data: result,
  });
});

/**
 * Reject order product (Admin/Owner)
 */
const rejectProduct = catchAsync(async (req: Request, res: Response) => {
  const { orderProductId } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  const result = await orderServices.rejectProduct(
    orderProductId,
    userId,
    reason
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product rejected successfully",
    data: result,
  });
});

/**
 * Adjust product quantity (Driver)
 */
const adjustProductQuantity = catchAsync(
  async (req: Request, res: Response) => {
    const { orderProductId } = req.params;
    const { newWeight, reason } = req.body;
    const userId = req.user.id;
    const result = await orderServices.adjustProductQuantity(
      orderProductId,
      newWeight,
      userId,
      reason
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Product quantity adjusted successfully",
      data: result,
    });
  }
);

/**
 * Get order by ID
 */
const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await orderServices.getOrderById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Order retrieved successfully",
    data: result,
  });
});

export const orderControllers = {
  createOrder,
  getUserDailyOrders,
  getTodayOrder,
  getAllDailyOrders,
  getDailyDispatch,
  acceptProduct,
  rejectProduct,
  adjustProductQuantity,
  getOrderById,
};
