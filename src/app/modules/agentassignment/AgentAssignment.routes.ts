import express from "express";
import { AgentAssignmentControllers } from "./AgentAssignment.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post("/", auth(), AgentAssignmentControllers.createAgentAssignment);
router.get("/", auth(), AgentAssignmentControllers.getAllAgentAssignments);
router.get("/:id", auth(), AgentAssignmentControllers.getAgentAssignmentById);
router.patch("/:id", auth(), AgentAssignmentControllers.updateAgentAssignment);
router.delete("/:id", auth(), AgentAssignmentControllers.deleteAgentAssignment);

export const AgentAssignmentRoutes = router;


















