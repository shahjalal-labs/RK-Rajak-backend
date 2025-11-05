import express from "express";
import { PaymentControllers } from "./payment.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

/**
 * Cashfree webhook endpoint (No auth required - called by Cashfree)
 * This must match the webhook URL configured in Cashfree dashboard
 */
router.post("/webhook/cashfree", PaymentControllers.cashfreeWebhook);

/**
 * Verify payment status (Customer can check their payment)
 */
router.get("/verify/:orderId", auth("Customer"), PaymentControllers.verifyPayment);

/**
 * Get payment details (Customer/Admin)
 */
router.get("/:orderId", auth("Customer", "Admin", "SuperAdmin"), PaymentControllers.getPaymentDetails);

export const PaymentRoutes = router;
