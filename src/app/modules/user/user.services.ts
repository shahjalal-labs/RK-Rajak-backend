import { PendingUser, User, UserRole, verificationUsers } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import bcrypt from "bcryptjs";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import prisma from "../../../shared/prisma";
import generateOTP from "../../../helpers/generateOtp";
import { uploadInSpace } from "../../../shared/UploadHelper";
import getModelKeys from "../../../helpers/getModelKeys";
import QueryBuilder from "../../builder/QueryBuilder";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToDigitalOceanAWS";

const resendVerifyOTP = async (phone: string) => {
  console.log(phone);
  const existingUser = await prisma.pendingUser.findUnique({
    where: { phone: phone },
  });
  if (!existingUser) {
    throw new ApiError(404, "User not found!");
  }

  const otp = generateOTP();
  const OTP_EXPIRATION_TIME = 5 * 60 * 1000;
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  await prisma.pendingUser.update({
    where: {
      phone: phone,
    },
    data: {
      otpCode: otp,
      expiresAt: new Date(expiresAt),
    },
  });

  return { otp };
};

const buyerOtpLogin = async (
  phone: string,
  otp: string,
  fcmToken?: string,
  referralCode?: string
) => {
  const userPending = await prisma.pendingUser.findUnique({
    where: { phone: phone, role: UserRole.Customer },
  });
  if (!userPending) {
    throw new ApiError(409, "User doesn't exist!");
  }

  const { otpCode, expiresAt } = userPending;

  if (otp !== otpCode) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.pendingUser.delete({
      where: {
        phone: userPending.phone,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  // OTP is valid
  await prisma.pendingUser.delete({
    where: {
      phone: phone,
    },
  });

  const isExistingUser = await prisma.user.findUnique({
    where: { phone: phone },
  });
  // if user already exists and Otp is valid then send token
  if (isExistingUser) {
    const accessToken = jwtHelpers.generateToken(
      {
        id: isExistingUser.id,
        email: isExistingUser?.email,
        phone: isExistingUser.phone,
        role: isExistingUser.role,
      },
      config.jwt.jwt_secret as string,
      config.jwt.expires_in as string
    );
    return {
      accessToken,
      id: isExistingUser.id,
      role: isExistingUser.role,
    };
  }

  ///----------- if your not existing user then create new user and calculate othes things ----------///

  // reffaralCode calcualte + send money in raffaral useg account and add new user a random rafferal code 6 digit

  if (referralCode) {
    const refUser = await prisma.user.findFirst({
      where: { referralCode: referralCode },
    });
    if (refUser) {
      // send money to refUser account
      const referralAmount = 50;
      //!TODO
      return;
    }
  }

  // own Otp creation and saving
  const raffaralCode = `${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  const user = await prisma.user.create({
    data: {
      phone: phone,
      role: userPending.role as UserRole,
      status: "Active",
      fcmToken: fcmToken ?? "",
      referralCode: raffaralCode,
    },
  });
  // access token
  const accessToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user?.email,
      phone: user.phone,
      role: user.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );
  return {
    accessToken,
    id: user.id,
    role: user.role,
  };
};
const authOtpLogin = async (phone: string, otp: string, fcmToken?: string) => {
  const userPending = await prisma.pendingUser.findUnique({
    where: {
      phone: phone,
      role: {
        not: UserRole.Customer,
      },
    },
  });
  if (!userPending) {
    throw new ApiError(409, "OTP request not found!");
  }

  const { otpCode, expiresAt } = userPending;

  if (otp !== otpCode) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.pendingUser.delete({
      where: {
        phone: userPending.phone,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  // OTP is valid
  await prisma.pendingUser.delete({
    where: {
      phone: phone,
    },
  });

  const isExistingUser = await prisma.user.findUnique({
    where: { phone: phone },
  });
  if (!isExistingUser) {
    throw new ApiError(404, "User not found!");
  }

  // save fcm token
  if (fcmToken) {
    await prisma.user.update({
      where: { phone: phone },
      data: { fcmToken: fcmToken },
    });
  }

  // if user already exists and Otp is valid then send token
  const accessToken = jwtHelpers.generateToken(
    {
      id: isExistingUser.id,
      email: isExistingUser?.email,
      phone: isExistingUser.phone,
      role: isExistingUser.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );
  return {
    accessToken,
    id: isExistingUser.id,
    role: isExistingUser.role,
  };
};

const getSingleUserIntoDB = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    throw new ApiError(404, "user not found!");
  }
  return user;
};

const blockUser = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });
  if (!user) {
    throw new ApiError(404, "User not found for delete");
  }

  await prisma.user.update({
    where: { id },
    data: {
      status: "Blocked",
    },
  });

  return;
};

const getUsers = async (query: any) => {
  const keys = await getModelKeys("user");
  const couponQuery = new QueryBuilder(prisma.user, query, keys);
  const result = await couponQuery
    .setCustomWhere({
      role: UserRole.Customer,
    })
    .search(["fullName", "email"])
    .filter()
    .sort()
    .exclude()
    .include()
    .paginate()
    .execute();
  const pagination = await couponQuery.countTotal();
  return {
    meta: pagination,
    result,
  };
};

const updateUser = async (
  payload: User,
  userId: string,
  file: Express.Multer.File
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "user not found for edit user");
  }

  let profileImage;

  if (file) {
    profileImage = await uploadInSpace(file, "users/profileImage");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...payload,
      profileImage: file ? profileImage : user.profileImage,
    },
  });

  return;
};

const deleteMyAccount = async (userId: string) => {
  const existingUser = await getSingleUserIntoDB(userId);
  if (!existingUser) {
    throw new ApiError(404, "user not found for delete this");
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "Deleted",
    },
  });
  return;
};
const deleteUserAccount = async (userId: string) => {
  const existingUser = await getSingleUserIntoDB(userId);
  if (!existingUser) {
    throw new ApiError(404, "user not found for delete this");
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "Deleted",
    },
  });
  return;
};
const verifyMyAccount = async (
  userId: string,
  payload: verificationUsers,
  files: Express.Multer.File[],
  buyerPhoto: Express.Multer.File,
  shopPhoto: Express.Multer.File
) => {
  let uploadFiles: string[] = [];
  let buyerPhotoUrl = "";
  let shopPhotoUrl = "";

  try {
    uploadFiles = await Promise.all(
      files.map(async (file) => {
        const url = (await uploadToDigitalOceanAWS(file)).Location;
        return url;
      })
    );

    // upload buyerPhoto
    buyerPhotoUrl = (await uploadToDigitalOceanAWS(buyerPhoto)).Location;
    shopPhotoUrl = (await uploadToDigitalOceanAWS(shopPhoto)).Location;
  } catch (error: any) {
    throw new ApiError(500, "File upload failed: " + error.message);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isVerifyed: true,
    },
  });

  await prisma.verificationUsers.create({
    data: {
      userId : userId,
      buyerName: payload.buyerName,
      buyerPhoto: buyerPhotoUrl,
      shopName: payload.shopName,
      shopPhoto: shopPhotoUrl,
      documents: uploadFiles,
    },
  });
  return;
};

export const userService = {
  buyerOtpLogin,
  getUsers,
  getSingleUserIntoDB,
  updateUser,
  deleteMyAccount,
  resendVerifyOTP,
  blockUser,
  authOtpLogin,
  deleteUserAccount,
  verifyMyAccount,
};
