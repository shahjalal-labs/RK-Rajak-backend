import express from "express";
import { notificationController } from "./notification.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get("/notification-for-admin", auth(UserRole.Admin, UserRole.SuperAdmin,UserRole.Owner), notificationController.getNotificationsForAdmin);
router.get("/", auth(), notificationController.getNotifications);
router.get(
  "/:id",
  auth(),
  notificationController.getSingleNotificationById
);


export const notificationsRoute = router;
