import { IncentiveType, UserRole } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { format, addDays, addMonths, startOfDay, endOfDay } from "date-fns";
import {
  sendSingleNotification,
  createAdminNotification,
} from "../notifications/notification.services";

/**
 * ========================================
 * DRIVER INCENTIVE HELPERS (Daily Zero Returns)
 * ========================================
 */

/**
 * Auto-create or get driver progress for today
 */
export const getOrCreateDriverProgress = async (
  driverId: string,
  incentiveId: string
) => {
  const currentDate = format(new Date(), "yyyy-MM-dd");

  let progress = await prisma.driverIncentiveProgress.findFirst({
    where: {
      driverId,
      incentiveId,
      currentDate,
    },
  });

  if (!progress) {
    progress = await prisma.driverIncentiveProgress.create({
      data: {
        driverId,
        incentiveId,
        currentDate,
        totalAssignedOrders: 0,
        completedOrders: 0,
        zeroReturnOrders: 0,
        hasReturns: false,
        isEligibleForReward: false,
        rewardClaimed: false,
      },
    });
  }

  return progress;
};

/**
 * Update driver progress when order is delivered
 * NOTE: Rewards are NOT created here. They're created at END OF DAY by cron job.
 */
export const updateDriverProgressOnDelivery = async (
  driverId: string,
  orderId: string,
  hasReturns: boolean
) => {
  // Get all active Zero Returns incentives for this driver's branch
  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    include: { branch: true },
  });

  if (!driver || !driver.branchId) return;

  const incentives = await prisma.incentive.findMany({
    where: {
      branchId: driver.branchId,
      role: UserRole.Driver,
      type: IncentiveType.Zero_returns,
    },
  });

  for (const incentive of incentives) {
    const progress = await getOrCreateDriverProgress(driverId, incentive.id);

    // Update progress - just track the data
    await prisma.driverIncentiveProgress.update({
      where: { id: progress.id },
      data: {
        completedOrders: { increment: 1 },
        zeroReturnOrders: hasReturns ? progress.zeroReturnOrders : { increment: 1 },
        hasReturns: hasReturns ? true : progress.hasReturns,
      },
    });

    // ⚠️ DO NOT create reward here!
    // Reward will be created at END OF DAY by cron job
    // This ensures we check ALL orders for the day, not just completed ones
  }
};

/**
 * Update driver progress when orders are assigned
 */
export const updateDriverProgressOnAssignment = async (
  driverId: string,
  orderCount: number
) => {
  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    include: { branch: true },
  });

  if (!driver || !driver.branchId) return;

  const incentives = await prisma.incentive.findMany({
    where: {
      branchId: driver.branchId,
      role: UserRole.Driver,
      type: IncentiveType.Zero_returns,
    },
  });

  for (const incentive of incentives) {
    const progress = await getOrCreateDriverProgress(driverId, incentive.id);

    await prisma.driverIncentiveProgress.update({
      where: { id: progress.id },
      data: {
        totalAssignedOrders: { increment: orderCount },
      },
    });
  }
};

/**
 * Create reward for driver
 */
const createRewardForDriver = async (
  driverId: string,
  incentiveId: string,
  amount: number,
  branchId?: string | null
) => {
  const existingReward = await prisma.reward.findFirst({
    where: {
      userId: driverId,
      incentiveId,
      achievedAt: {
        gte: startOfDay(new Date()),
        lte: endOfDay(new Date()),
      },
    },
  });

  if (existingReward) return existingReward;

  const reward = await prisma.reward.create({
    data: {
      userId: driverId,
      incentiveId,
      amount,
      achievedAt: new Date(),
    },
  });

  // Admin notification: driver incentive achieved
  try {
        await createAdminNotification({
          title: "Driver Incentive Achieved",
          content: `Driver ${driverId} achieved an incentive reward of ₹${amount}.`,
          branchId: branchId ?? null,
        });
  } catch (error) {
    console.error(
      "Failed to create admin notification for driver incentive:",
      error
    );
  }

  return reward;
};

/**
 * Reset all driver progress for the day (called by cron)
 * This runs at END OF DAY and checks if ALL assigned orders have zero returns
 */
export const resetDriverProgressDaily = async () => {
  const today = format(new Date(), "yyyy-MM-dd");

  // Get all driver progress from today
  const todayProgress = await prisma.driverIncentiveProgress.findMany({
    where: {
      currentDate: today,
    },
    include: {
      incentive: true,
    },
  });

  let rewardsCreated = 0;

  // Check each driver's progress for the day
  for (const progress of todayProgress) {
    // Check if driver completed ALL assigned orders with zero returns
    const isEligible =
      progress.totalAssignedOrders > 0 && // Had orders assigned
      progress.completedOrders === progress.totalAssignedOrders && // Completed all assigned orders
      !progress.hasReturns && // No returns at all
      !progress.rewardClaimed; // Not already claimed

    if (isEligible) {
      // Create reward
      await createRewardForDriver(
        progress.driverId,
        progress.incentiveId,
        progress.incentive?.rewardAmount || 0,
        progress.incentive?.branchId || null
      );

      // Send notification to driver about reward
      try {
        await sendSingleNotification(
          progress.driverId,
          `Congratulations! You achieved zero returns for all ${progress.totalAssignedOrders} orders today. Your incentive reward of ₹${progress.incentive?.rewardAmount} has been recorded! 🎉`,
          undefined,
          "Incentive Reward Achieved"
        );
      } catch (error) {
        console.error("Failed to send driver incentive notification:", error);
      }

      // Mark as claimed
      await prisma.driverIncentiveProgress.update({
        where: { id: progress.id },
        data: { 
          rewardClaimed: true,
          isEligibleForReward: true 
        },
      });

      rewardsCreated++;
    } else if (progress.totalAssignedOrders > 0) {
      // Had orders but didn't qualify
      await prisma.driverIncentiveProgress.update({
        where: { id: progress.id },
        data: { isEligibleForReward: false },
      });
    }
  }

  console.log(`[Incentives] Driver daily reset completed. ${rewardsCreated} rewards created from ${todayProgress.length} drivers.`);
};

/**
 * ========================================
 * AGENT INCENTIVE HELPERS (Weekly/Monthly)
 * ========================================
 */

/**
 * Auto-create agent progress when incentive is created
 */
export const createAgentProgressForIncentive = async (
  agentId: string,
  incentiveId: string,
  targetAmount: number,
  type: IncentiveType
) => {
  const now = new Date();
  const periodType = type === IncentiveType.Weekly_achievement ? "weekly" : "monthly";
  const endAt =
    type === IncentiveType.Weekly_achievement
      ? addDays(now, 7)
      : addMonths(now, 1);

  const existingProgress = await prisma.agentIncentiveProgress.findFirst({
    where: {
      agentId,
      incentiveId,
      startAt: { lte: now },
      endAt: { gte: now },
    },
  });

  if (existingProgress) return existingProgress;

  return await prisma.agentIncentiveProgress.create({
    data: {
      agentId,
      incentiveId,
      targetAmount,
      currentAmount: 0,
      startAt: now,
      endAt,
      periodType,
      isCompleted: false,
      rewardClaimed: false,
    },
  });
};

/**
 * Update agent progress (called when agent makes sales/completes work)
 * NOTE: Only ONE reward per period, even if target hit multiple times
 */
export const updateAgentProgress = async (
  agentId: string,
  amount: number
) => {
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    include: { branch: true },
  });

  if (!agent || !agent.branchId) return;

  // Get active agent incentives for this branch
  const incentives = await prisma.incentive.findMany({
    where: {
      branchId: agent.branchId,
      role: UserRole.Agent,
      type: {
        in: [IncentiveType.Weekly_achievement, IncentiveType.Monthly_achievement],
      },
    },
  });

  const now = new Date();

  for (const incentive of incentives) {
    // Get or create current period progress
    let progress = await prisma.agentIncentiveProgress.findFirst({
      where: {
        agentId,
        incentiveId: incentive.id,
        startAt: { lte: now },
        endAt: { gte: now },
      },
    });

    if (!progress) {
      progress = await createAgentProgressForIncentive(
        agentId,
        incentive.id,
        incentive.targetAmount || 0,
        incentive.type
      );
    }

    // Update current amount
    const updatedProgress = await prisma.agentIncentiveProgress.update({
      where: { id: progress.id },
      data: {
        currentAmount: { increment: amount },
      },
    });

    // Check if target achieved for the FIRST TIME in this period
    const targetReached = updatedProgress.currentAmount >= updatedProgress.targetAmount;

    // NOTE: Only ONE reward per period
    if (targetReached && !updatedProgress.isCompleted && !updatedProgress.rewardClaimed) {
      // Mark as completed
      await prisma.agentIncentiveProgress.update({
        where: { id: updatedProgress.id },
        data: { isCompleted: true },
      });

      // Create reward ONLY ONCE per period
      await createRewardForAgent(
        agentId,
        incentive.id,
        incentive.rewardAmount,
        incentive.branchId || null
      );
      
      // Mark reward as claimed to prevent duplicate rewards
      await prisma.agentIncentiveProgress.update({
        where: { id: updatedProgress.id },
        data: { rewardClaimed: true },
      });
      
      console.log(`[Incentives] Agent ${agentId} achieved target! Reward created for period ${progress.periodType}`);

      // Send notification to agent about reward achievement
      try {
        await sendSingleNotification(
          agentId,
          `Congratulations! You achieved your ${progress.periodType.toLowerCase()} target of ₹${updatedProgress.targetAmount}. Your incentive reward of ₹${incentive.rewardAmount} has been recorded! 🎉`,
          undefined,
          "Target Achieved!"
        );
      } catch (error) {
        console.error("Failed to send agent incentive notification:", error);
      }
    }
    // If already claimed, do nothing - agent gets ONLY ONE reward per period
  }
};

/**
 * Create reward for agent
 */
const createRewardForAgent = async (
  agentId: string,
  incentiveId: string,
  amount: number,
  branchId?: string | null
) => {
  const reward = await prisma.reward.create({
    data: {
      userId: agentId,
      incentiveId,
      amount,
      achievedAt: new Date(),
    },
  });

  // Admin notification: agent incentive achieved
  try {
        await createAdminNotification({
          title: "Agent Incentive Achieved",
          content: `Agent ${agentId} achieved an incentive reward of ₹${amount}.`,
          branchId: branchId ?? null,
        });
  } catch (error) {
    console.error(
      "Failed to create admin notification for agent incentive:",
      error
    );
  }

  return reward;
};

/**
 * Reset agent progress for expired periods
 * Creates reward if target achieved but not claimed yet
 * Creates new period for next 7/30 days
 */
export const resetAgentProgressPeriodic = async () => {
  const now = new Date();

  // Find all expired periods (endAt has passed)
  const expiredProgress = await prisma.agentIncentiveProgress.findMany({
    where: {
      endAt: { lte: now },
    },
    include: {
      incentive: true,
      user: true,
    },
  });

  let rewardsCreated = 0;
  let periodsCreated = 0;

  for (const progress of expiredProgress) {
    // Create reward ONLY if achieved and not already claimed
    if (progress.isCompleted && !progress.rewardClaimed) {
      await createRewardForAgent(
        progress.agentId,
        progress.incentiveId,
        progress.incentive?.rewardAmount || 0,
        progress.incentive?.branchId || null
      );

      await prisma.agentIncentiveProgress.update({
        where: { id: progress.id },
        data: { rewardClaimed: true },
      });

      rewardsCreated++;
    }

    // Create new period ONLY if incentive still exists and user still an agent
    if (progress.incentive && progress.user?.role === UserRole.Agent) {
      await createAgentProgressForIncentive(
        progress.agentId,
        progress.incentiveId,
        progress.incentive.targetAmount || 0,
        progress.incentive.type
      );
      periodsCreated++;
    }
  }

  console.log(`[Incentives] Agent periodic reset: ${rewardsCreated} rewards created, ${periodsCreated} new periods started from ${expiredProgress.length} expired periods.`);
};

/**
 * ========================================
 * INITIALIZATION HELPERS
 * ========================================
 */

/**
 * Initialize progress for all drivers when incentive is created
 */
export const initializeDriverProgressForIncentive = async (
  incentiveId: string,
  branchId: string
) => {
  // Get all drivers in this branch
  const drivers = await prisma.user.findMany({
    where: {
      role: UserRole.Driver,
      branchId,
    },
  });

  const currentDate = format(new Date(), "yyyy-MM-dd");

  for (const driver of drivers) {
    await getOrCreateDriverProgress(driver.id, incentiveId);
  }

  console.log(`[Incentives] Initialized progress for ${drivers.length} drivers`);
};

/**
 * Initialize progress for all agents when incentive is created
 */
export const initializeAgentProgressForIncentive = async (
  incentiveId: string,
  branchId: string,
  targetAmount: number,
  type: IncentiveType
) => {
  // Get all agents in this branch
  const agents = await prisma.user.findMany({
    where: {
      role: UserRole.Agent,
      branchId,
    },
  });

  for (const agent of agents) {
    await createAgentProgressForIncentive(agent.id, incentiveId, targetAmount, type);
  }

  console.log(`[Incentives] Initialized progress for ${agents.length} agents`);
};

/**
 * ========================================
 * NEW USER INITIALIZATION
 * ========================================
 */

/**
 * Initialize progress for a newly created driver
 * Called when admin creates a new driver account
 */
export const initializeProgressForNewDriver = async (
  driverId: string,
  branchId: string
) => {
  // Get all active Zero Returns incentives for this branch
  const incentives = await prisma.incentive.findMany({
    where: {
      branchId,
      role: UserRole.Driver,
      type: IncentiveType.Zero_returns,
    },
  });

  for (const incentive of incentives) {
    await getOrCreateDriverProgress(driverId, incentive.id);
  }

  console.log(`[Incentives] Initialized ${incentives.length} driver incentive(s) for new driver`);
};

/**
 * Initialize progress for a newly created agent
 * Called when admin creates a new agent account
 */
export const initializeProgressForNewAgent = async (
  agentId: string,
  branchId: string
) => {
  // Get all active agent incentives for this branch
  const incentives = await prisma.incentive.findMany({
    where: {
      branchId,
      role: UserRole.Agent,
      type: {
        in: [IncentiveType.Weekly_achievement, IncentiveType.Monthly_achievement],
      },
    },
  });

  for (const incentive of incentives) {
    await createAgentProgressForIncentive(
      agentId,
      incentive.id,
      incentive.targetAmount || 0,
      incentive.type
    );
  }

  console.log(`[Incentives] Initialized ${incentives.length} agent incentive(s) for new agent`);
};
