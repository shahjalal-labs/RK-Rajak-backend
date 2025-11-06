import express from "express";
import { PaymentControllers } from "./payment.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// Wallet recharge
router.post(
  "/wallet/recharge",
  auth(UserRole.Customer),
  PaymentControllers.createWalletRecharge
);

// Dues payment
router.post(
  "/dues/payment",
  auth(UserRole.Customer),
  PaymentControllers.createDuesPayment
);

// Get user dues
router.get(
  "/dues/:userId",
  auth(UserRole.Customer, UserRole.Owner, UserRole.Driver, UserRole.SuperAdmin),
  PaymentControllers.getUserDues
);

// Webhook endpoints (no auth required - Cashfree calls these)
router.post("/webhook/wallet-recharge", PaymentControllers.walletRechargeWebhook);
router.post("/webhook/dues-payment", PaymentControllers.duesPaymentWebhook);

export const PaymentRoutes = router;
