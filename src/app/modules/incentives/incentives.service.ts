import { Incentive, IncentiveType, UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// ==================== CRUD Operations ====================

type CreateIncentiveInput = {
  role: UserRole;
  type: IncentiveType;
  targetAmount: number;
  rewardAmount: number;
  branchId: string;
};

const createIncentives = async (data: CreateIncentiveInput) => {
  if(data.type ===  "Refar"){
    // is refar exist for the branch
    const isExist = await prisma.incentive.findFirst({
      where: {
        type: IncentiveType.Refar,
        branchId: data.branchId,
      },
    });
    if (isExist) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Referral incentive already exists for this branch, cannot create another one."
      );
    }
  }
  
  return await prisma.incentive.create({ data });
};

const getAllIncentivess = async (query?: {
  role?: UserRole;
  type?: IncentiveType;
  branchId?: string;
}) => {
  const where: any = {};

  if (query?.role) where.role = query.role;
  if (query?.type) where.type = query.type;
  if (query?.branchId) where.branchId = query.branchId;

  return await prisma.incentive.findMany({
    where,
    include: {
      branch: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getIncentivesById = async (id: string) => {
  const res = await prisma.incentive.findUnique({
    where: { id },
    include: {
      branch: true,
    },
  });

  if (!res) {
    throw new ApiError(httpStatus.NOT_FOUND, "Incentive not found");
  }

  return res;
};

const updateIncentives = async (id: string, data: Partial<CreateIncentiveInput>) => {
  const isExist = await prisma.incentive.findUnique({ where: { id } });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Incentive not found");
  }

  return await prisma.incentive.update({ where: { id }, data });
};

const deleteIncentives = async (id: string) => {
  const isExist = await prisma.incentive.findUnique({ where: { id } });

  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Incentive not found");
  }

  return await prisma.incentive.delete({ where: { id } });
};

// ==================== Progress & Reward System ====================

type UpdateProgressInput = {
  userId: string;
  incentiveId: string;
  incrementAmount: number;
};

type UpdateProgressResult = {
  progress: {
    id: string;
    userId: string;
    incentiveId: string;
    currentAmount: number;
    completed: boolean;
  };
  rewardCreated: boolean;
  reward?: {
    id: string;
    amount: number;
    achievedAt: Date;
  };
};

/**
 * Updates incentive progress and creates reward if target is reached
 * @param userId - The user's ID
 * @param incentiveId - The incentive's ID
 * @param incrementAmount - Amount to add to current progress
 * @returns Progress update result with reward info if created
 */
const updateIncentiveProgress = async (
  input: UpdateProgressInput
): Promise<UpdateProgressResult> => {
  const { userId, incentiveId, incrementAmount } = input;

  // Validate input
  if (incrementAmount <= 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Increment amount must be positive"
    );
  }

  // Get incentive details
  const incentive = await prisma.incentive.findUnique({
    where: { id: incentiveId },
  });

  if (!incentive) {
    throw new ApiError(httpStatus.NOT_FOUND, "Incentive not found");
  }

  // Refar type doesn't need progress tracking
  if (incentive.type === IncentiveType.Refar) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Referral incentives do not require progress tracking"
    );
  }

  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // Find or create progress
    let progress = await tx.incentiveProgress.findFirst({
      where: {
        userId,
        incentiveId,
      },
    });

    if (!progress) {
      // Create new progress entry
      progress = await tx.incentiveProgress.create({
        data: {
          userId,
          incentiveId,
          currentAmount: incrementAmount,
          completed: false,
        },
      });
    } else {
      // If already completed, don't update
      if (progress.completed) {
        return {
          progress: {
            id: progress.id,
            userId: progress.userId,
            incentiveId: progress.incentiveId,
            currentAmount: progress.currentAmount,
            completed: progress.completed,
          },
          rewardCreated: false,
        };
      }

      // Update existing progress
      progress = await tx.incentiveProgress.update({
        where: { id: progress.id },
        data: {
          currentAmount: progress.currentAmount + incrementAmount,
        },
      });
    }

    // Check if target is reached
    let rewardCreated = false;
    let reward = undefined;

    if (progress.currentAmount >= incentive.targetAmount && !progress.completed) {
      // Mark progress as completed
      progress = await tx.incentiveProgress.update({
        where: { id: progress.id },
        data: { completed: true },
      });

      // Create reward
      const newReward = await tx.reward.create({
        data: {
          userId,
          incentiveId,
          amount: incentive.rewardAmount,
          achievedAt: new Date(),
        },
      });

      rewardCreated = true;
      reward = {
        id: newReward.id,
        amount: newReward.amount,
        achievedAt: newReward.achievedAt,
      };
    }

    return {
      progress: {
        id: progress.id,
        userId: progress.userId,
        incentiveId: progress.incentiveId,
        currentAmount: progress.currentAmount,
        completed: progress.completed,
      },
      rewardCreated,
      reward,
    };
  });
};

/**
 * Create a reward for referral incentive (doesn't need progress tracking)
 */
const createReferralReward = async (userId: string, incentiveId: string) => {
  const incentive = await prisma.incentive.findUnique({
    where: { id: incentiveId },
  });

  if (!incentive) {
    throw new ApiError(httpStatus.NOT_FOUND, "Incentive not found");
  }

  if (incentive.type !== IncentiveType.Refar) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This function is only for referral incentives"
    );
  }

  // Check if reward already exists
  const existingReward = await prisma.reward.findFirst({
    where: {
      userId,
      incentiveId,
    },
  });

  if (existingReward) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Reward already claimed for this referral"
    );
  }

  return await prisma.reward.create({
    data: {
      userId,
      incentiveId,
      amount: incentive.rewardAmount,
      achievedAt: new Date(),
    },
  });
};

/**
 * Get user's progress for all incentives
 */
const getUserProgress = async (userId: string) => {
  const progress = await prisma.incentiveProgress.findMany({
    where: { userId },
    include: {
      incentive: {
        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return progress.map((p) => ({
    id: p.id,
    currentAmount: p.currentAmount,
    targetAmount: p.incentive?.targetAmount,
    rewardAmount: p.incentive?.rewardAmount,
    completed: p.completed,
    percentageComplete: (p.currentAmount / (p.incentive?.targetAmount || 1)) * 100,
    incentive: {
      id: p.incentive?.id,
      type: p.incentive?.type,
      role: p.incentive?.role,
      branch: p.incentive?.branch,
    },
  }));
};

/**
 * Get user's rewards
 */
const getUserRewards = async (userId: string) => {
  return await prisma.reward.findMany({
    where: { userId },
    include: {
      incentive: {
        select: {
          id: true,
          type: true,
          role: true,
          targetAmount: true,
          branchId: true,
        },
      },
    },
    orderBy: { achievedAt: "desc" },
  });
};

/**
 * Get all rewards (for admin)
 */
const getAllRewards = async (query?: {
  userId?: string;
  incentiveId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const where: any = {};

  if (query?.userId) where.userId = query.userId;
  if (query?.incentiveId) where.incentiveId = query.incentiveId;

  if (query?.startDate || query?.endDate) {
    where.achievedAt = {};
    if (query.startDate) {
      where.achievedAt.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      where.achievedAt.lte = new Date(query.endDate);
    }
  }

  return await prisma.reward.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
        },
      },
      incentive: {
        select: {
          id: true,
          type: true,
          role: true,
          targetAmount: true,
        },
      },
    },
    orderBy: { achievedAt: "desc" },
  });
};

export const incentivesServices = {
  // CRUD
  createIncentives,
  getAllIncentivess,
  getIncentivesById,
  updateIncentives,
  deleteIncentives,

  // Progress & Rewards
  updateIncentiveProgress,
  createReferralReward,
  getUserProgress,
  getUserRewards,
  getAllRewards,
};
  