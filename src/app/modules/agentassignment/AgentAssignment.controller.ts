import { Request, Response } from 'express';
import {AgentAssignmentServices} from './AgentAssignment.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const createAgentAssignment = catchAsync (async (req: Request, res: Response) => {
  const result = await AgentAssignmentServices.createAgentAssignment(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The AgentAssignment has been created successfully",
    data: result,
  });
})
 
const getAllAgentAssignments = catchAsync(async (_req: Request, res: Response) => {
  const result = await AgentAssignmentServices.getAllAgentAssignments();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All AgentAssignments has been retrived successfully",
    data: result,
  });
})
 
const getAgentAssignmentById = catchAsync(async (req: Request, res: Response) => {
  const result = await AgentAssignmentServices.getAgentAssignmentById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "AgentAssignment has been retrived successfully",
    data: result,
  });
})
 
const updateAgentAssignment = catchAsync(async (req: Request, res: Response) => {
  const result = await AgentAssignmentServices.updateAgentAssignment(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "AgentAssignment has been updated successfully",
    data: result,
  });
})
 
const deleteAgentAssignment = catchAsync(async (req: Request, res: Response) => {
  await AgentAssignmentServices.deleteAgentAssignment(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "AgentAssignment has been deleted successfully",
  });
})
 
export const AgentAssignmentControllers = {
  createAgentAssignment,
  getAllAgentAssignments,
  getAgentAssignmentById,
  updateAgentAssignment,
  deleteAgentAssignment,
}
  