import { Request, Response } from "express";
import { incentivesServices } from "./incentives.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";

// ==================== CRUD Operations ====================

const createIncentives = catchAsync(async (req: Request, res: Response) => {
  const result = await incentivesServices.createIncentives(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Incentive created successfully",
    data: result,
  });
});

const getAllIncentivess = catchAsync(async (req: Request, res: Response) => {
  const result = await incentivesServices.getAllIncentivess(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All incentives retrieved successfully",
    data: result,
  });
});

const getIncentivesById = catchAsync(async (req: Request, res: Response) => {
  const result = await incentivesServices.getIncentivesById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Incentive retrieved successfully",
    data: result,
  });
});

const updateIncentives = catchAsync(async (req: Request, res: Response) => {
  const result = await incentivesServices.updateIncentives(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Incentive updated successfully",
    data: result,
  });
});

const deleteIncentives = catchAsync(async (req: Request, res: Response) => {
  await incentivesServices.deleteIncentives(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Incentive deleted successfully",
  });
});

// ==================== Progress & Rewards ====================

const updateIncentiveProgress = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, incentiveId, incrementAmount } = req.body;
    const result = await incentivesServices.updateIncentiveProgress({
      userId,
      incentiveId,
      incrementAmount,
    });
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: result.rewardCreated
        ? "Progress updated and reward earned!"
        : "Progress updated successfully",
      data: result,
    });
  }
);

const createReferralReward = catchAsync(
  async (req: Request, res: Response) => {
    const { userId, incentiveId } = req.body;
    const result = await incentivesServices.createReferralReward(
      userId,
      incentiveId
    );
    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "Referral reward created successfully",
      data: result,
    });
  }
);

const getUserProgress = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const result = await incentivesServices.getUserProgress(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User progress retrieved successfully",
    data: result,
  });
});

const getMyProgress = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id; // Assuming auth middleware sets req.user
  const result = await incentivesServices.getUserProgress(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Your progress retrieved successfully",
    data: result,
  });
});

const getUserRewards = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const result = await incentivesServices.getUserRewards(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User rewards retrieved successfully",
    data: result,
  });
});

const getMyRewards = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id; // Assuming auth middleware sets req.user
  const result = await incentivesServices.getUserRewards(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Your rewards retrieved successfully",
    data: result,
  });
});

const getAllRewards = catchAsync(async (req: Request, res: Response) => {
  const result = await incentivesServices.getAllRewards(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All rewards retrieved successfully",
    data: result,
  });
});

export const incentivesControllers = {
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
  getMyProgress,
  getUserRewards,
  getMyRewards,
  getAllRewards,
};
  