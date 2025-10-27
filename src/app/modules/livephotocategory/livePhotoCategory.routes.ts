import express from 'express';
import { livePhotoCategoryControllers } from "./livePhotoCategory.controller";
 
const router = express.Router();
 
router.post('/', livePhotoCategoryControllers.createLivePhotoCategory);
router.get('/', livePhotoCategoryControllers.getAllLivePhotoCategorys);
router.get('/:id', livePhotoCategoryControllers.getLivePhotoCategoryById);
router.patch('/:id', livePhotoCategoryControllers.updateLivePhotoCategory);
router.delete('/:id', livePhotoCategoryControllers.deleteLivePhotoCategory);
 
export const livePhotoCategoryRoutes = router;
  