import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const create[INFO = async (data: [INFO) => {
  return await prisma.[INFO.create({ data });
};

const getAll[INFOs = async () => {
  return await prisma.[INFO.findMany();
};

const get[INFOById = async (id: string) => {
  const res = await prisma.[INFO.findUnique({ where: { id } });
  if(!res){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
};

const update[INFO = async (id: string, data: Partial<[INFO>) => {
  const isExist = await prisma.[INFO.findUnique({ where: { id } });
  if(!isExist){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
  return await prisma.[INFO.update({ where: { id }, data });
};

const delete[INFO = async (id: string) => {
  const isExist = await prisma.[INFO.findUnique({ where: { id } });
  if(!isExist){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
  return await prisma.[INFO.delete({ where: { id } });
};

export const [INFOServices = {
  create[INFO,
  getAll[INFOs,
  get[INFOById,
  update[INFO,
  delete[INFO,
}
  