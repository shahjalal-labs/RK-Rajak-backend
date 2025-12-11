import { Incentive, IncentiveType, UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  initializeDriverProgressForIncentive,
  initializeAgentProgressForIncentive,
} from "./incentives.helper";

// ==================== CRUD Operations ====================

type CreateIncentiveInput = {
  role: UserRole;
  type: IncentiveType;
  targetAmount?: number;
  rewardAmount: number;
  branchId: string;
};

const createIncentives = async (data: CreateIncentiveInput) => {
  // Validate Referral incentive uniqueness
  if (data.type === "Refar") {
    if (data.role !== UserRole.Customer) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Referral incentives can only be created for Customer role."
      );
    }
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

  // Validate Agent incentives require target amount
  if (data.role === "Agent" && !data.targetAmount) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Target amount is required for Agent role."
    );
  }

  // Validate Driver incentives are only Zero Returns
  if (
    data.role === UserRole.Driver &&
    data.type !== IncentiveType.Zero_returns
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Driver incentives can only be of type Zero_returns."
    );
  }

  // Validate Agent incentives are Weekly or Monthly
  if (
    data.role === UserRole.Agent &&
    data.type !== IncentiveType.Weekly_achievement &&
    data.type !== IncentiveType.Monthly_achievement
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Agent incentives must be either Weekly_achievement or Monthly_achievement."
    );
  }

  // Create incentive
  const incentive = await prisma.incentive.create({ data });

  // Auto-initialize progress for existing users
  if (
    data.role === UserRole.Driver &&
    data.type === IncentiveType.Zero_returns
  ) {
    await initializeDriverProgressForIncentive(incentive.id, data.branchId);
  }

  if (
    data.role === UserRole.Agent &&
    (data.type === IncentiveType.Weekly_achievement ||
      data.type === IncentiveType.Monthly_achievement)
  ) {
    await initializeAgentProgressForIncentive(
      incentive.id,
      data.branchId,
      data.targetAmount || 0,
      data.type
    );
  }

  return incentive;
};

const getAllIncentivess = async (query?: { branchId?: string }) => {
  const where: any = {};

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

const updateIncentives = async (
  id: string,
  data: Partial<CreateIncentiveInput>
) => {
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

/**
 * Get user's progress for all incentives
 */
const getUserProgress = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  console.log({ user });

  // Get driver progress
  if (user.role === UserRole.Driver) {
    const driverProgress = await prisma.driverIncentiveProgress.findMany({
      where: { driverId: userId },
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

    return driverProgress.map((p) => ({
      id: p.id,
      type: "driver",
      totalAssignedOrders: p.totalAssignedOrders,
      completedOrders: p.completedOrders,
      zeroReturnOrders: p.zeroReturnOrders,
      hasReturns: p.hasReturns,
      isEligibleForReward: p.isEligibleForReward,
      rewardClaimed: p.rewardClaimed,
      currentDate: p.currentDate,
      rewardAmount: p.incentive?.rewardAmount,
      incentive: {
        id: p.incentive?.id,
        type: p.incentive?.type,
        role: p.incentive?.role,
        branch: p.incentive?.branch,
      },
    }));
  }

  // Get agent progress
  if (user.role === UserRole.Agent) {
    const agentProgress = await prisma.agentIncentiveProgress.findMany({
      where: { agentId: userId },
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

    console.log({ agentProgress });

    return agentProgress.map((p) => {
      // Cap percentage at 100% (even if currentAmount is 1000% of target)
      const rawPercentage = (p.currentAmount / p.targetAmount) * 100;
      const percentageComplete = Math.min(rawPercentage, 100);

      return {
        id: p.id,
        type: "agent",
        currentAmount: p.currentAmount,
        targetAmount: p.targetAmount,
        rewardAmount: p.incentive?.rewardAmount,
        isCompleted: p.isCompleted,
        rewardClaimed: p.rewardClaimed,
        percentageComplete: percentageComplete, // Capped at 100%
        periodType: p.periodType,
        startAt: p.startAt,
        endAt: p.endAt,
        incentive: {
          id: p.incentive?.id,
          type: p.incentive?.type,
          role: p.incentive?.role,
          branch: p.incentive?.branch,
        },
      };
    });
  }

  return [];
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
  userRole?: string;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return await prisma.reward.findMany({
    where: {
      user: {
        fullName: query?.searchTerm
          ? { contains: query.searchTerm, mode: "insensitive" }
          : undefined,
        role: query?.userRole ? (query.userRole as UserRole) : undefined,
      },
      createdAt: {
        gte: query?.startDate ? new Date(query.startDate) : undefined,
        lte: query?.endDate ? new Date(query.endDate) : undefined,
      },
    },
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
  getUserProgress,
  getUserRewards,
  getAllRewards,
};
