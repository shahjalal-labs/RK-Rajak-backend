import ApiError from "../../../errors/ApiErrors";
import admin from "../../../shared/firebase.admin";
import prisma from "../../../shared/prisma";

// Send notification to a single user
export const sendSingleNotification = async (
  receiverId: string,
  content: string,
  senderId?: string,
  title?: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: receiverId },
  });
  if (!user?.fcmToken) {
    await prisma.notification.create({
      data: {
        title,
        receiverId,
        senderId,
        content,
      },
    });
    throw new ApiError(404, "User not found with FCM token");
  }
  const message = {
    notification: {
      title: title || "Notification",
      body: content,
    },
    token: user.fcmToken,
  };
  await prisma.notification.create({
    data: {
      title,
      receiverId,
      senderId,
      content,
    },
  });

  try {
    const response = await admin.messaging().send(message);
    return response;
  } catch (error: any) {
    if (error.code === "messaging/invalid-registration-token") {
      throw new ApiError(400, "Invalid FCM registration token");
    } else if (error.code === "messaging/registration-token-not-registered") {
      throw new ApiError(404, "FCM token is no longer registered");
    } else {
      return;
    }
  }
};

export const sendNotifications = async (body: string, title: string) => {
  try {
    const users = await prisma.user.findMany({
      where: { fcmToken: { not: null } },
      select: { id: true, fcmToken: true },
    });

    if (users.length === 0) {
      throw new ApiError(404, "No users found with valid FCM tokens.");
    }

    const fcmTokens = users.map((user) => user.fcmToken);

    const message = {
      notification: {
        title: title || "Notification",
        body: body,
      },
      tokens: fcmTokens,
    };
    const response = await admin
      .messaging()
      .sendEachForMulticast(message as any);
    const successIndices = response.responses
      .map((res, idx) => (res.success ? idx : null))
      .filter((idx) => idx !== null) as number[];

    const successfulUsers = successIndices.map((idx) => users[idx]);
    if (successfulUsers.length > 0) {
      await prisma.notification.createMany({
        data: successfulUsers.map((user) => ({
          receiverId: user.id,
          title: title || "Notification",
          content: body,
        })),
      });
    }
    const failedTokens = response.responses
      .map((res, idx) => (!res.success ? fcmTokens[idx] : null))
      .filter((token) => token !== null);

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error("Error sending notifications:", error);
    throw new ApiError(500, "Failed to send notifications.");
  }
};

const getNotificationsFromDB = async (req: any) => {
  const notifications = await prisma.notification.findMany({
    where: {
      receiverId: req.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  return notifications;
};

export const sendGroupNotifications = async (
  userIds: string[],
  title: string,
  body: string,
  senderId?: string
) => {
  console.log("hitt the notifications");
  console.log(userIds)
  if (!userIds || userIds.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, fcmToken: { not: null } },
    select: { id: true, fcmToken: true },
  });

  if (users.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }
  const fcmTokens = users.map((u) => u.fcmToken);

  const message = {
    notification: {
      title: title || "Notification",
      body,
    },
    tokens: fcmTokens,
  };

  const res = await prisma.notification.createMany({
    data: users.map((user) => ({
      receiverId: user.id,
      senderId,
      title: title || "Notification",
      content: body,
    })),
  });
  console.log("from the teacher!",res);

  const response = await admin.messaging().sendEachForMulticast(message as any);
  // Save notifications for successful users
  const successIndices = response.responses
    .map((res, idx) => (res.success ? idx : null))
    .filter((idx) => idx !== null) as number[];

  const successfulUsers = successIndices.map((idx) => users[idx]);
  console.log("first", { successIndices }, { successfulUsers });
  if (successfulUsers.length > 0) {
  }

  const failedTokens = response.responses
    .map((res, idx) => (!res.success ? fcmTokens[idx] : null))
    .filter((token) => token !== null);

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    failedTokens,
  };
};

const getSingleNotificationFromDB = async (
  req: any,
  notificationId: string
) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      receiverId: req.user.id,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found for the user");
  }

  const updateNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updateNotification;
};

export const notificationServices = {
  getNotificationsFromDB,
  getSingleNotificationFromDB,
};
