import { branch, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const createBranch = async (data: branch) => {
  return await prisma.branch.create({ data });
};

const getAllBranchs = async () => {
  return await prisma.branch.findMany();
};

const getBranchById = async (id: string) => {
  return await prisma.branch.findUnique({ where: { id } });
};

const updateBranch = async (id: string, data: branch) => {
  return await prisma.branch.update({ where: { id }, data });
};

const deleteBranch = async (id: string) => {
  return await prisma.branch.delete({ where: { id } });
};

export const branchServices = {
  createBranch,
  getAllBranchs,
  getBranchById,
  updateBranch,
  deleteBranch,
};
