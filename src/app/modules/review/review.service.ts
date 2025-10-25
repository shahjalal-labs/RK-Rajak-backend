import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";

const createReview = async (
  data: Review,
  userId: string,
  productId: string
) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create the new review
    const newReview = await tx.review.create({
      data: {
        ...data,
        userId,
      },
    });

    // 2. Recalculate average using aggregate
    const aggregate = await tx.review.aggregate({
      where: { userId },
      _avg: { rating: true },
    });

    // 3. Update user rating
    await tx.user.update({
      where: { id: userId },
      data: {
        buyerRating: aggregate._avg.rating ?? 0,
      },
    });

    return newReview;
  });
};


const getAllReviews = async (query: any) => {
  return await prisma.review.findMany({
    where: {},
    orderBy: { rating: "desc" },
  });
};

const getReviewById = async (id: string) => {
  return await prisma.review.findUnique({
    where: { id },
  });
};

const updateReview = async (id: string, data: any, userId: string) => {
  return await prisma.review.update({
    where: { id },
    data,
  });
};

const deleteReview = async (id: string, userId: string) => {
  return await prisma.review.delete({
    where: { id },
  });
};

export const reviewService = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
};
