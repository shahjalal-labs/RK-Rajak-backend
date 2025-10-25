import catchAsync from "../../../shared/catchAsync";
import { authService } from "./auth.service";
import sendResponse from "../../../shared/sendResponse";

const buyerLogin = catchAsync(async (req, res) => {
  const result = await authService.buyerLoginIntoDB(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Buyer login OTP sent successfully",
    data: result,
  });
});

const authLogin = catchAsync(async (req, res) => {
  const result = await authService.authLoginIntoDB(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "login OTP sended successfully please check your phone",
    data: result,
  });
});

const getProfile = catchAsync(async (req: any, res) => {
  const { id } = req.user;
  const user = await authService.getProfileFromDB(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile retrieved successfully",
    data: user,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File;
  await authService.updateProfileIntoDB(req.body, req.user.id, file);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile update successfully",
  });
});
const updateUserLocation = catchAsync(async (req, res) => {
  const { id } = req.user;
  const updatedUser = await authService.userLocationUpdateInDB(id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User location added successfully",
    data: updatedUser,
  });
});

export const authController = {
  getProfile,
  updateProfile,
  authLogin,
  buyerLogin,
  updateUserLocation 
};
