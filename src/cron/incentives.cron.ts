import cron from "node-cron";
import {
  resetDriverProgressDaily,
  resetAgentProgressPeriodic,
} from "../app/modules/incentives/incentives.helper";

/**
 * ========================================
 * DRIVER DAILY RESET CRON
 * ========================================
 * Runs every night at 00:00 (midnight)
 * - Checks yesterday's driver progress
 * - Creates rewards for eligible drivers
 * - New day progress will be auto-created when needed
 */
export const driverDailyResetCron = cron.schedule(
  "0 0 * * *", // Every day at 00:00
  async () => {
    console.log("🔄 Running driver daily reset cron...");
    try {
      await resetDriverProgressDaily();
    } catch (error) {
      console.error("❌ Error in driver daily reset cron:", error);
    }
  },
  {
    timezone: "Asia/Kolkata", // Adjust to your timezone
  }
);

/**
 * ========================================
 * AGENT PERIODIC RESET CRON
 * ========================================
 * Runs every night at 00:30 (midnight)
 * - Checks for expired weekly/monthly periods
 * - Creates rewards for completed agents
 * - Creates new period progress automatically
 */
export const agentPeriodicResetCron = cron.schedule(
  "30 0 * * *", // Every day at 00:30
  async () => {
    console.log("🔄 Running agent periodic reset cron...");
    try {
      await resetAgentProgressPeriodic();
    } catch (error) {
      console.error("❌ Error in agent periodic reset cron:", error);
    }
  },
  {
    timezone: "Asia/Kolkata", // Adjust to your timezone
  }
);

/**
 * Start all incentive cron jobs
 */
export const startIncentiveCrons = () => {
  driverDailyResetCron.start();
  agentPeriodicResetCron.start();
  console.log("✅ Incentive cron jobs started successfully");
};

/**
 * Stop all incentive cron jobs
 */
export const stopIncentiveCrons = () => {
  driverDailyResetCron.stop();
  agentPeriodicResetCron.stop();
  console.log("🛑 Incentive cron jobs stopped");
};
