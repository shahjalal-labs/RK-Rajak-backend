import express from "express";
import { authController } from "./auth.controller";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import validateRequest from "../../middlewares/validateRequest";
import { authValidation } from "./auth.validation";

const router = express.Router();

router.post("/buyer-login", validateRequest(authValidation.authLoginSchema), authController.buyerLogin);
router.post("/auth-login", authController.authLogin);
router.get("/profile", auth(), authController.getProfile);
router.put(
  "/set-profile",
  auth(),
  fileUploader.profileImage,
  parseBodyData,
  authController.updateProfile
);
router.patch(
  "/update/user-location",
  auth(),
  authController.updateUserLocation
);
export const authRoute = router;