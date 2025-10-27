import { Request, Response } from 'express';
import {branchServices} from './branch.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const createBranch = catchAsync (async (req: Request, res: Response) => {
  const result = await branchServices.createBranch(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The branch has been created successfully",
    data: result,
  });
})
 
const getAllBranchs = catchAsync(async (_req: Request, res: Response) => {
  const result = await branchServices.getAllBranchs();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All branchs has been retrived successfully",
    data: result,
  });
})
 
const getBranchById = catchAsync(async (req: Request, res: Response) => {
  const result = await branchServices.getBranchById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "branch has been retrived successfully",
    data: result,
  });
})
 
const updateBranch = catchAsync(async (req: Request, res: Response) => {
  const result = await branchServices.updateBranch(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "branch has been updated successfully",
    data: result,
  });
})
 
const deleteBranch = catchAsync(async (req: Request, res: Response) => {
  await branchServices.deleteBranch(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "branch has been deleted successfully",
  });
})
 
export const branchControllers = {
  createBranch,
  getAllBranchs,
  getBranchById,
  updateBranch,
  deleteBranch,
}
  