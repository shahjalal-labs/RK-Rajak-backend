import { AgentAssignment, PrismaClient } from '@prisma/client';
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';
const prisma = new PrismaClient();

const createAgentAssignment = async (data: AgentAssignment) => {
  return await prisma.agentAssignment.create({ data });
};

const getAllAgentAssignments = async () => {
  return await prisma.agentAssignment.findMany();
};

const getAgentAssignmentById = async (id: string) => {
  const res = await prisma.agentAssignment.findUnique({ where: { id } });
  if(!res){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
};

const updateAgentAssignment = async (id: string, data: Partial<AgentAssignment>) => {
  const isExist = await prisma.agentAssignment.findUnique({ where: { id } });
  if(!isExist){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
  return await prisma.agentAssignment.update({ where: { id }, data });
};

const deleteAgentAssignment = async (id: string) => {
  const isExist = await prisma.agentAssignment.findUnique({ where: { id } });
  if(!isExist){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
  return await prisma.agentAssignment.delete({ where: { id } });
};

export const AgentAssignmentServices = {
  createAgentAssignment,
  getAllAgentAssignments,
  getAgentAssignmentById,
  updateAgentAssignment,
  deleteAgentAssignment,
}
  