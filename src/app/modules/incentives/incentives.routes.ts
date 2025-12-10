import express from "express";
import { incentivesControllers } from './incentives.controller';
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { createIncentivesSchema } from "./incentives.validation";

const router = express.Router();

// ==================== CRUD Operations (Admin/Owner) ====================
router.post(
  "/",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  validateRequest(createIncentivesSchema),
  incentivesControllers.createIncentives
);

router.get(
  "/",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.getAllIncentivess
);

router.get(
  "/:id",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.getIncentivesById
);

router.patch(
  "/:id",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.updateIncentives
);

router.delete(
  "/:id",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.deleteIncentives
);

// ==================== Progress & Rewards ====================

// Update progress (can be called by system/admin)
router.post(
  "/progress/update",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.updateIncentiveProgress
);

// Create referral reward
router.post(
  "/rewards/referral",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.createReferralReward
);

// Get all rewards (Admin)
router.get(
  "/rewards/all",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.getAllRewards
);

// Get user's own progress
router.get(
  "/progress/my",
  auth(),
  incentivesControllers.getMyProgress
);

// Get user's own rewards
router.get(
  "/rewards/my",
  auth(),
  incentivesControllers.getMyRewards
);

// Get specific user's progress (Admin)
router.get(
  "/progress/:userId",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.getUserProgress
);

// Get specific user's rewards (Admin)
router.get(
  "/rewards/:userId",
  auth(UserRole.SuperAdmin, UserRole.Owner),
  incentivesControllers.getUserRewards
);

export const incentivesRoutes = router;