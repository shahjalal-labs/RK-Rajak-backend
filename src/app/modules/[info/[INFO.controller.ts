import { Request, Response } from 'express';
import {[INFOServices} from './[INFO.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const create[INFO = catchAsync (async (req: Request, res: Response) => {
  const result = await [INFOServices.create[INFO(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The [INFO has been created successfully",
    data: result,
  });
})
 
const getAll[INFOs = catchAsync(async (_req: Request, res: Response) => {
  const result = await [INFOServices.getAll[INFOs();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All [INFOs has been retrived successfully",
    data: result,
  });
})
 
const get[INFOById = catchAsync(async (req: Request, res: Response) => {
  const result = await [INFOServices.get[INFOById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "[INFO has been retrived successfully",
    data: result,
  });
})
 
const update[INFO = catchAsync(async (req: Request, res: Response) => {
  const result = await [INFOServices.update[INFO(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "[INFO has been updated successfully",
    data: result,
  });
})
 
const delete[INFO = catchAsync(async (req: Request, res: Response) => {
  await [INFOServices.delete[INFO(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "[INFO has been deleted successfully",
  });
})
 
export const [INFOControllers = {
  create[INFO,
  getAll[INFOs,
  get[INFOById,
  update[INFO,
  delete[INFO,
}
  