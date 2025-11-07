import express from 'express';
import { handalingChargeControllers } from "./handalingCharge.controller";
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { HandalingChargeSchemaValidation } from './handalingCharge.validation';
import { UserRole } from '@prisma/client';
 
const router = express.Router();
 
router.post(
  '/',
  auth(UserRole.Owner, UserRole.SuperAdmin),
  validateRequest(HandalingChargeSchemaValidation.createHandalingChargeSchema),
  handalingChargeControllers.createHandalingCharge
);

router.get(
  '/',
  auth(UserRole.Owner, UserRole.SuperAdmin),
  handalingChargeControllers.getAllHandalingCharges
);

router.get(
  '/:branchId',
  auth(UserRole.Owner, UserRole.SuperAdmin),
  handalingChargeControllers.getHandalingChargeById
);

router.patch(
  '/:id',
  auth(UserRole.Owner, UserRole.SuperAdmin),
  validateRequest(HandalingChargeSchemaValidation.updateHandalingChargeSchema),
  handalingChargeControllers.updateHandalingCharge
);

router.delete(
  '/:id',
  auth(UserRole.Owner, UserRole.SuperAdmin),
  handalingChargeControllers.deleteHandalingCharge
);
 
export const handalingChargeRoutes = router;
  