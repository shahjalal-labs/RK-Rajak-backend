import express from "express";
import { livePhotoCategoryControllers } from "./livePhotoCategory.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { LivePhotoCategorySchemaValidation } from "./livePhotoCategory.validation";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

router.post(
  "/",
  auth(UserRole.SuperAdmin),
  fileUploader.uploadSingle,
  parseBodyData,
  validateRequest(
    LivePhotoCategorySchemaValidation.createLivePhotoCategorySchema
  ),
  livePhotoCategoryControllers.createLivePhotoCategory
);
router.get(
  "/:branchId",
  auth(),
  livePhotoCategoryControllers.getAllLivePhotoCategorys
);
router.get(
  "/:id",
  auth(UserRole.SuperAdmin),
  livePhotoCategoryControllers.getLivePhotoCategoryById
);
router.patch(
  "/:id",
  auth(UserRole.SuperAdmin),
  fileUploader.uploadSingle,
  parseBodyData,
  validateRequest(
    LivePhotoCategorySchemaValidation.updateLivePhotoCategorySchema
  ),
  livePhotoCategoryControllers.updateLivePhotoCategory
);
router.delete(
  "/:id",
  auth(UserRole.SuperAdmin),
  livePhotoCategoryControllers.deleteLivePhotoCategory
);

router.get("/category-details/:id", livePhotoCategoryControllers.getCategoryDetails);

export const livePhotoCategoryRoutes = router;
