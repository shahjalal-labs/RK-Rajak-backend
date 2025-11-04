import express from 'express';
import { WalletControllers } from "./Wallet.controller";
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.post('/recharge-balance', auth(UserRole.Customer), WalletControllers.rechargeBalance);
router.get('/my-wallet',auth(UserRole.Customer), WalletControllers.getWalletById);
router.get('/', auth(), WalletControllers.getAllWallets);

export const WalletRoutes = router;
