import express from 'express';
import { livePhotoControllers } from "./livePhoto.controller";
 
const router = express.Router();
 
router.post('/', livePhotoControllers.createLivePhoto);
router.get('/', livePhotoControllers.getAllLivePhotos);
router.get('/:id', livePhotoControllers.getLivePhotoById);
router.patch('/:id', livePhotoControllers.updateLivePhoto);
router.delete('/:id', livePhotoControllers.deleteLivePhoto);
 
export const livePhotoRoutes = router;
  