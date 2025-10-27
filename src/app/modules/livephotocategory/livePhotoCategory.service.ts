import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
 
const createLivePhotoCategory = async (data: any) => {
  return await prisma.livePhotoCategory.create({ data });
};
 
const getAllLivePhotoCategorys = async () => {
  return await prisma.livePhotoCategory.findMany();
};
 
const getLivePhotoCategoryById = async (id: string) => {
  return await prisma.livePhotoCategory.findUnique({ where: { id } });
};
 
const updateLivePhotoCategory = async (id: string, data: any) => {
  return await prisma.livePhotoCategory.update({ where: { id }, data });
};
 
const deleteLivePhotoCategory = async (id: string) => {
  return await prisma.livePhotoCategory.delete({ where: { id } });
};
 
export const livePhotoCategoryServices = {
  createLivePhotoCategory,
  getAllLivePhotoCategorys,
  getLivePhotoCategoryById,
  updateLivePhotoCategory,
  deleteLivePhotoCategory,
}
  