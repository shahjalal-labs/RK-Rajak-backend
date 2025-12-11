import * as z from "zod";
import { UserRole, IncentiveType } from "@prisma/client";

export const createIncentivesSchema = z.object({
  role: z.nativeEnum(UserRole),
  type: z.nativeEnum(IncentiveType),
  targetAmount: z.number().positive("Target amount must be positive").optional(),
  rewardAmount: z.number().positive("Reward amount must be positive"),
  branchId: z.string({ required_error: "Branch ID is required" }),
});

export const updateIncentivesSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  type: z.nativeEnum(IncentiveType).optional(),
  targetAmount: z
    .number()
    .positive("Target amount must be positive")
    .optional(),
  rewardAmount: z
    .number()
    .positive("Reward amount must be positive")
    .optional(),
  branchId: z.string().optional(),
});

export const updateProgressSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  incentiveId: z.string().min(1, "Incentive ID is required"),
  incrementAmount: z.number().positive("Increment amount must be positive"),
});

export const createReferralRewardSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  incentiveId: z.string().min(1, "Incentive ID is required"),
});

export const IncentivesSchemaValidation = {
  createIncentivesSchema,
  updateIncentivesSchema,
  updateProgressSchema,
  createReferralRewardSchema,
};
