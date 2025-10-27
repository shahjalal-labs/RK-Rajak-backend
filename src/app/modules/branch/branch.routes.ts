import express from "express";
import { branchControllers } from "./branch.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post("/", auth(UserRole.Owner), branchControllers.createBranch);
router.get("/", auth(UserRole.Owner), branchControllers.getAllBranchs);
router.get("/:id", auth(UserRole.Owner), branchControllers.getBranchById);
router.patch("/:id", auth(UserRole.Owner), branchControllers.updateBranch);
router.delete("/:id", auth(UserRole.Owner), branchControllers.deleteBranch);

export const branchRoutes = router;
