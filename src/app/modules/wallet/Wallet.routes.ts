import express from 'express';
import { WalletControllers } from "./Wallet.controller";
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

// NOTE: For wallet recharge, use POST /payment/wallet/recharge endpoint
// That endpoint uses Cashfree payment gateway

router.get('/my-wallet', auth(UserRole.Customer), WalletControllers.getWalletById);
router.get('/', auth(), WalletControllers.getAllWallets);
router.get("/S-Admin-wallet-transaction", auth(UserRole.SuperAdmin , UserRole.Owner), WalletControllers.getWalletTransactionForSuperAdmin);
router.get("/total-wallet-usages", auth(UserRole.SuperAdmin), WalletControllers.getTotalWalletUsagesForSuperAdmin);

export const WalletRoutes = router;
