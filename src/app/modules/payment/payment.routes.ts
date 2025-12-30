import express from "express";
import { PaymentControllers } from "./payment.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();
//! order Details for Agent if Needed

// pending payments
router.get(
  "/pending-payments",
  auth(UserRole.Customer),
  PaymentControllers.getPendingPayments
);
// sales agent
router.get(
  "/my-customers/pending-amounts",
  auth(UserRole.Agent),
  PaymentControllers.getSalesAgentCustomersPendingAmounts
);
// get Details single one
router.get(
  "/pending-amount/:userId",
  auth(UserRole.Owner, UserRole.Driver, UserRole.SuperAdmin , UserRole.Agent),
  PaymentControllers.getPaymentDetails
);

// Wallet recharge
router.post(
  "/wallet/recharge",
  auth(UserRole.Customer),
  PaymentControllers.createWalletRecharge
);

// Dues payment
router.post(
  "/clear-dues-payment",
  auth(UserRole.Customer),
  PaymentControllers.clearDuesPayment
);

// Webhook endpoints (no auth required - Cashfree calls these)
router.post(
  "/webhook/wallet-recharge",
  PaymentControllers.walletRechargeWebhook
);
router.post("/webhook/dues-payment", PaymentControllers.duesPaymentWebhook);

export const PaymentRoutes = router;