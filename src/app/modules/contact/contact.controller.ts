import { Request, Response } from 'express';
import {contactServices} from './contact.service';
import sendResponse from '../../../shared/sendResponse';
import catchAsync from "../../../shared/catchAsync";
 
const createContact = catchAsync (async (req: Request, res: Response) => {
  const result = await contactServices.createContact(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The contact has been created successfully",
    data: result,
  });
})

const getAllContacts = catchAsync(async (_req: Request, res: Response) => {
  const result = await contactServices.getAllContacts(_req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All contacts has been retrived successfully",
    data: result,
  });
})
 
const getContactById = catchAsync(async (req: Request, res: Response) => {
  const result = await contactServices.getContactById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "contact has been retrived successfully",
    data: result,
  });
})
 
const updateContact = catchAsync(async (req: Request, res: Response) => {
  const result = await contactServices.updateContact(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "contact has been updated successfully",
    data: result,
  });
})
 
const deleteContact = catchAsync(async (req: Request, res: Response) => {
  await contactServices.deleteContact(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "contact has been deleted successfully",
  });
})
 
export const contactControllers = {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
}
  