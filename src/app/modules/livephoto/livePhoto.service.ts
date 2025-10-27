import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
 
const createLivePhoto = async (data: any) => {
  return await prisma.livePhoto.create({ data });
};
 
const getAllLivePhotos = async () => {
  return await prisma.livePhoto.findMany();
};
 
const getLivePhotoById = async (id: string) => {
  return await prisma.livePhoto.findUnique({ where: { id } });
};
 
const updateLivePhoto = async (id: string, data: any) => {
  return await prisma.livePhoto.update({ where: { id }, data });
};
 
const deleteLivePhoto = async (id: string) => {
  return await prisma.livePhoto.delete({ where: { id } });
};
 
export const livePhotoServices = {
  createLivePhoto,
  getAllLivePhotos,
  getLivePhotoById,
  updateLivePhoto,
  deleteLivePhoto,
}
  