import express from "express";
import { bannerControllers } from "./banner.controller";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

router.post(
  "/",
  auth(),
  fileUploader.uploadMultiple,
  parseBodyData,
  bannerControllers.upsertBanner
);
router.get("/:branchId", bannerControllers.getBannerByBranchId);

export const bannerRoutes = router;
