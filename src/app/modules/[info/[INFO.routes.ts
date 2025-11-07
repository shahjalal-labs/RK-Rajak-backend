import express from 'express';
import { [INFOControllers } from "./[INFO.controller";
 
const router = express.Router();
 
router.post('/', auth(), [INFOControllers.create[INFO);
router.get('/', auth(), [INFOControllers.getAll[INFOs);
router.get('/:id',auth(), [INFOControllers.get[INFOById);
router.patch('/:id',auth(), [INFOControllers.update[INFO);
router.delete('/:id',auth(), [INFOControllers.delete[INFO);
 
export const [INFORoutes = router;
  