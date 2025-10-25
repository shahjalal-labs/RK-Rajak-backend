import { z } from "zod";


export const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  productId: z.string().optional(), // যদি optional রাখতে চাও
});

// Update এর জন্য আলাদা schema (partial)
export const updateReviewSchema = createReviewSchema.partial();


export const reviewValidation = {
  createReviewSchema,
};