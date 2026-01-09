import express from "express";
import { livePhotoControllers } from "./livePhoto.controller";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import validateRequest from "../../middlewares/validateRequest";
import { LivePhotoSchemaValidation } from "./livePhoto.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/upload-photo/:categoryId",
  auth(UserRole.SuperAdmin),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(LivePhotoSchemaValidation.createLivePhotoSchema),
  livePhotoControllers.createLivePhoto
);
router.delete(
  "/upload-photo/:id",
  auth(UserRole.SuperAdmin),
  livePhotoControllers.deleteLivePhoto
);
export const livePhotoRoutes = router;
