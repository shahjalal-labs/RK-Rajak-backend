import express from "express";
import { reviewController } from "./review.controller";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { reviewValidation } from "./review.validation";
import { UserRole } from "@prisma/client";

const reviewRouter = express.Router();

reviewRouter.post(
  "/create/:productId",
  auth(),
  validateRequest(reviewValidation.createReviewSchema),
  reviewController.createReview
);
reviewRouter.get("/", auth(UserRole.Admin), reviewController.getAllReviews);
reviewRouter.get("/:id", reviewController.getReviewById);
reviewRouter.patch("/:id", auth(), reviewController.updateReview);
reviewRouter.delete(
  "/:id",
  auth(UserRole.Admin),
  reviewController.deleteReview
);

export default reviewRouter;
