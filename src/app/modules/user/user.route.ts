import express from "express";
import { UserControllers } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();
router.post("/otp-resend", UserControllers.resendOTP);
router.post(
  "/buyer-otp-login",
  validateRequest(userValidation.buyerLoginValidation),
  UserControllers.buyerOtpLogin
);

router.post(
  "/auth-otp-login",
  validateRequest(userValidation.authLoginValidation),
  UserControllers.authOtpLogin
);

//------------------  User creation by Owner ------------------//

router.post(
  "/user-create",
  auth(UserRole.Owner),
  validateRequest(userValidation.userCreateValidation),
  UserControllers.createUserByOwner
);

router.get("/", auth(UserRole.Owner), UserControllers.getUsers);
router.get("/customers/:branchId", auth(UserRole.Owner , UserRole.SuperAdmin), UserControllers.getCustomersForBranch);
router.get('/all-agents', auth(UserRole.Owner, UserRole.SuperAdmin), UserControllers.getAllAgents);
router.get(
  "/single/:id",
  auth(UserRole.Owner, UserRole.Admin, UserRole.SuperAdmin),
  UserControllers.getSingleUser
);
router.patch(
  "/block-user/:id",
  auth(UserRole.Admin),
  UserControllers.blockUser
);
router.delete("/", auth(), UserControllers.deleteMyAccount);
router.delete(
  "/delete-user/:id",
  auth(UserRole.Owner),
  UserControllers.deleteUserAccount
);
router.patch(
  "/update-user/:userId",
  auth(UserRole.Owner , UserRole.SuperAdmin),
  fileUploader.profileImage,
  parseBodyData,
  UserControllers.updateUser
);
router.post(
  "/verify-my-account",
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(userValidation.userVerifyValidation),
  auth(),
  UserControllers.verifyMyAccount
);

export const userRoutes = router;
