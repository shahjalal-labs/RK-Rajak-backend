import { IncentiveType, UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { incentivesServices } from "./incentives.service";
import ApiError from "../../../errors/ApiErrors";

/**
 * Track order completion for weekly/monthly achievements
 * This should be called when an order is marked as delivered
 */
export const trackOrderCompletion = async (
  userId: string,
  orderAmount: number,
  userRole: UserRole,
  branchId: string
) => {
  try {
    // Get active incentives for this user's role
    const incentives = await prisma.incentive.findMany({
      where: {
        role: userRole,
        type: {
          in: [
            IncentiveType.Weekly_achievement,
            IncentiveType.Monthly_achievement,
          ],
        },
        branchId,
      },
    });

    // Update progress for each applicable incentive
    for (const incentive of incentives) {
      await incentivesServices.updateIncentiveProgress({
        userId,
        incentiveId: incentive.id,
        incrementAmount: orderAmount,
      });
    }
  } catch (error: any) {
    console.error("Error tracking order completion for incentives:", error);
    throw new ApiError(500, "Failed to track order completion for incentives");
    // Don't throw error to avoid breaking the main order flow
  }
};

/**
 * Track zero returns achievement
 * This should be called when checking order completion
 */
export const trackZeroReturns = async (
  userId: string,
  hadReturns: boolean,
  userRole: UserRole,
  branchId?: string
) => {
  try {
    // Only track if there were no returns
    if (hadReturns) return;

    // Get zero returns incentives for this user's role
    const incentives = await prisma.incentive.findMany({
      where: {
        role: userRole,
        type: IncentiveType.Zero_returns,
        ...(branchId && { branchId }),
      },
    });

    // Update progress (increment by 1 for each order with zero returns)
    for (const incentive of incentives) {
      await incentivesServices.updateIncentiveProgress({
        userId,
        incentiveId: incentive.id,
        incrementAmount: 1,
      });
    }
  } catch (error) {
    console.error("Error tracking zero returns for incentives:", error);
  }
};

/**
 * Handle referral reward when a new user signs up with a referral code
 * This should be called when a new user successfully registers
 */
export const handleReferralReward = async (
  referrerId: string,
  branchId?: string
) => {
  try {
    // Get referral incentive
    const incentive = await prisma.incentive.findFirst({
      where: {
        type: IncentiveType.Refar,
        ...(branchId && { branchId }),
      },
    });

    if (!incentive) {
      console.log("No referral incentive configured");
      return;
    }

    // Create referral reward
    await incentivesServices.createReferralReward(referrerId, incentive.id);
  } catch (error) {
    console.error("Error creating referral reward:", error);
  }
};

/**
 * Reset weekly progress for all users
 * This should be run on a cron job every week
 */
export const resetWeeklyProgress = async () => {
  try {
    // Get all weekly incentives
    const weeklyIncentives = await prisma.incentive.findMany({
      where: {
        type: IncentiveType.Weekly_achievement,
      },
    });

    // Reset progress for incomplete weekly goals
    for (const incentive of weeklyIncentives) {
      await prisma.incentiveProgress.deleteMany({
        where: {
          incentiveId: incentive.id,
          completed: false,
        },
      });
    }

    console.log("Weekly progress reset successfully");
  } catch (error) {
    console.error("Error resetting weekly progress:", error);
  }
};

/**
 * Reset monthly progress for all users
 * This should be run on a cron job every month
 */
export const resetMonthlyProgress = async () => {
  try {
    // Get all monthly incentives
    const monthlyIncentives = await prisma.incentive.findMany({
      where: {
        type: IncentiveType.Monthly_achievement,
      },
    });

    // Reset progress for incomplete monthly goals
    for (const incentive of monthlyIncentives) {
      await prisma.incentiveProgress.deleteMany({
        where: {
          incentiveId: incentive.id,
          completed: false,
        },
      });
    }

    console.log("Monthly progress reset successfully");
  } catch (error) {
    console.error("Error resetting monthly progress:", error);
  }
};

/**
 * Get leaderboard for a specific incentive
 */
export const getIncentiveLeaderboard = async (
  incentiveId: string,
  limit: number = 10
) => {
  const progress = await prisma.incentiveProgress.findMany({
    where: {
      incentiveId,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          profileImage: true,
        },
      },
      incentive: {
        select: {
          targetAmount: true,
          rewardAmount: true,
        },
      },
    },
    orderBy: {
      currentAmount: "desc",
    },
    take: limit,
  });

  return progress.map((p, index) => ({
    rank: index + 1,
    user: p.user,
    currentAmount: p.currentAmount,
    targetAmount: p.incentive?.targetAmount,
    percentageComplete:
      (p.currentAmount / (p.incentive?.targetAmount || 1)) * 100,
    completed: p.completed,
  }));
};
