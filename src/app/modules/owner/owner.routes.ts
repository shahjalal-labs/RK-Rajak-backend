import express from 'express';
import { ownerControllers } from "./owner.controller";
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
 
const router = express.Router();
 
router.get('/overview', auth(UserRole.Owner), ownerControllers.getOverview);
router.get('/earning-reports', auth(UserRole.Owner), ownerControllers.getEarningReports);
router.get('/product-calculations',auth(UserRole.Owner), ownerControllers.getProductCalculations);
router.get('/highestSellingProducts',auth(UserRole.Owner), ownerControllers.getHighestSellingProducts);
router.delete('/:id',auth(UserRole.Owner), ownerControllers.deleteOwner);
 
export const ownerRoutes = router;
    