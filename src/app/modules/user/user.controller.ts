import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userService } from "./user.services";

// resend OTP
const resendOTP = catchAsync(async (req, res) => {
  if (req.body.phone === undefined) {
    throw new Error("Phone number is required");
  }
  const result = await userService.resendVerifyOTP(req.body.phone);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "OTP resend successfully",
    data: result,
  });
});

const buyerOtpLogin = catchAsync(async (req, res) => {
  const { phone, otp, fcmToken, referralCode } = req.body;
  const result = await userService.buyerOtpLogin(
    phone,
    otp,
    fcmToken,
    referralCode
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "login successfully",
    data: result,
  });
});
const authOtpLogin = catchAsync(async (req, res) => {
  const { phone, otp, fcmToken } = req.body;
  const result = await userService.authOtpLogin(phone, otp, fcmToken);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "login successfully",
    data: result,
  });
});

//get users
const getUsers = catchAsync(async (req, res) => {
  const users = await userService.getUsers(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Users retrived successfully",
    data: users,
  });
});
const getCustomersForBranch = catchAsync(async (req, res) => {
  const branchId = req.params.branchId;
  if (!branchId) {
    throw new Error("Branch id is required");
  }
  const users = await userService.getCustomersForBranch(req.query,branchId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Customer retrived successfully",
    data: users,
  });
});
const getAllAgents = catchAsync(async (req, res) => {
  const users = await userService.getAllAgentsFromDB(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Agent retrived successfully",
    data: users,
  });
});
const getAllDrivers = catchAsync(async (req, res) => {
  const users = await userService.getAllDriversFromDB(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver retrived successfully",
    data: users,
  });
});
const getMyCustomers = catchAsync(async (req, res) => {
  const users = await userService.getMyCustomersFromDB(req.query , req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: " Your Customer retrived successfully",
    data: users,
  });
});

//get single user
const getSingleUser = catchAsync(async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    throw new Error("User id is required");
  }
  const user = await userService.getSingleUserIntoDB(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user retrived successfully",
    data: user,
  });
});

//delete user
const blockUser = catchAsync(async (req, res) => {
  await userService.blockUser(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User blocked successfully",
  });
});

//update user
const updateUser = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File;
  await userService.updateUser(req.body, req.params.userId, file);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User updated successfully",
  });
});

//delete user
const deleteMyAccount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  await userService.deleteMyAccount(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "My account deleted successfully",
  });
});
const deleteUserAccount = catchAsync(async (req, res) => {
  const userId = req.params.id;
  if (!userId) {
    throw new Error("User id is required");
  }
  await userService.deleteUserAccount(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "account deleted successfully",
  });
});
const verifyMyAccount = catchAsync(async (req, res) => {
  const files = (
    req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
  )?.["documents"];
  if (!files || files.length === 0) {
    throw new Error("Documents are required");
  }
  const buyerPhoto = (
    req.files as { [fieldname: string]: Express.Multer.File[] | undefined }
  )?.["buyerPhoto"];
  const shopPhoto = (
    req.files as { [fieldname: string]: Express.Multer.File[] | undefined }
  )?.["shopPhoto"];
  if (!buyerPhoto || buyerPhoto.length === 0) {
    throw new Error("Buyer photo is required");
  }
  if (!shopPhoto || shopPhoto.length === 0) {
    throw new Error("Shop photo is required");
  }
  await userService.verifyMyAccount(req.user.id, req.body, files , buyerPhoto[0], shopPhoto[0]);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "account verified successfully",
  });
});

//------------------ User create by Owneer ---------------
const createUserByOwner = catchAsync(async(req , res)=>{
  const result = await userService.userCreateByOwner(req.body)
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User created successfully",
    data: result,
  });
})
const rateUser = catchAsync(async(req , res)=>{
  const result = await userService.rateUser(req.body)
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User rated successfully",
    data: result,
  });
})


export const UserControllers = {
  buyerOtpLogin,
  createUserByOwner,
  getUsers,
  getSingleUser,
  updateUser,
  deleteMyAccount,
  blockUser,
  resendOTP,
  authOtpLogin,
  deleteUserAccount,
  verifyMyAccount,
  getCustomersForBranch,
  getAllAgents,
  getMyCustomers,
  getAllDrivers,
  rateUser
};
