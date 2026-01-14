import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { notificationServices } from "./notification.services";

const getNotifications = catchAsync(async (req: any, res: any) => {
  const notifications = await notificationServices.getNotificationsFromDB(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: notifications,
  });
});
const getNotificationsForAdmin = catchAsync(async (req: any, res: any) => {
  const notifications = await notificationServices.getNotificationsForAdmin(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications (Admin) retrieved successfully",
    data: notifications,
  });
});

const getSingleNotificationById = catchAsync(async (req: any, res: any) => {
  const notificationId = req.params.id;
  const notification = await notificationServices.getSingleNotificationFromDB(
    req,
    notificationId
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Notification retrieved successfully",
    data: notification,
  });
});

export const notificationController = {
  getNotifications,
  getSingleNotificationById,
  getNotificationsForAdmin
};
