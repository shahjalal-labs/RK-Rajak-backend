import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { reviewService } from "./review.service";

// Create Review
const createReview = catchAsync(async (req, res) => {
  const {productId} = req.params
  await reviewService.createReview(req.body, req.user.id , productId);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Review created successfully",
  });
});

// Get All Reviews
const getAllReviews = catchAsync(async (req, res) => {
  const result = await reviewService.getAllReviews(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All reviews retrieved successfully",
    data: result,
  });
});

// Get Single Review
const getReviewById = catchAsync(async (req, res) => {
  const result = await reviewService.getReviewById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Review retrieved successfully",
    data: result,
  });
});

// Update Review
const updateReview = catchAsync(async (req, res) => {
  const result = await reviewService.updateReview(
    req.params.id,
    req.body,
    req.user.id
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Review updated successfully",
    data: result,
  });
});

// Delete Review
const deleteReview = catchAsync(async (req, res) => {
  const result = await reviewService.deleteReview(req.params.id, req.user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Review deleted successfully",
    data: result,
  });
});

export const reviewController = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
};
