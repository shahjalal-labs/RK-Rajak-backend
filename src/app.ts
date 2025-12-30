import express, { Application, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import cors from "cors";
import router from "./app/routes";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
import { PrismaClient } from "@prisma/client";
import path from "path";
import redisClient from "./helpers/radis";
import basicAuth  from "express-basic-auth"
import { bullBoardRouter } from "./bullBoard";

const app: Application = express();
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
    await redisClient.connect();
  } catch (error) {
    console.error("Failed to connect to services:", error);
    process.exit(1); // exit app if connection fails
  }
})();

app.use(cors());

// Cashfree webhook needs raw body for signature verification
app.use(
  "/api/v1/payment/webhook/wallet-recharge",
  express.raw({ type: "application/json" })
);
console.log(`✅ Recharge Webhook URL: https://api.absfresh.co.in/api/v1/payment/webhook/wallet-recharge`);
app.use(
  "/api/v1/payment/webhook/dues-payment",
  express.raw({ type: "application/json" })
);
console.log(`✅ Dues Payment Webhook URL: https://api.absfresh.co.in/api/v1/payment/webhook/dues-payment`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/public", express.static(path.join(__dirname, "..", "public")));

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use(
  "/admin/queues",
  basicAuth({
    users: { admin: process.env.BULLBOARD_PASSWORD || "supersecret" },
    challenge: true,
  }),
  bullBoardRouter
);

app.use("/api/v1", router);
app.use(GlobalErrorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "© Your requested path is not found!",
    },
  });
});

export default app;
