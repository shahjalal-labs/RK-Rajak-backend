import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { User, UserLocation, UserRole } from "@prisma/client";
import generateOTP from "../../../helpers/generateOtp";
import { uploadInSpace } from "../../../shared/UploadHelper";
import httpStatus from "http-status";
import { getDistance } from "./auth.helpers";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToDigitalOceanAWS";

const buyerLoginIntoDB = async (payload: { phone: string }) => {
  const user = await prisma.user.findUnique({
    where: {
      phone: payload.phone,
    },
  });
  if (!user) {
    // if user not found, create a new user with sending OTP
    const existingUser = await prisma.user.findFirst({
      where: { phone: payload.phone },
    });
    const otp = generateOTP(); // 4-digit OTP
    // let otp ; // 4-digit OTP

    const OTP_EXPIRATION_TIME = 5 * 60 * 1000;
    const expiresAt = Date.now() + OTP_EXPIRATION_TIME;

    await prisma.pendingUser.upsert({
      where: {
        phone: payload.phone,
      },
      update: { otpCode: otp, expiresAt: new Date(expiresAt) },
      create: {
        phone: payload.phone,
        role: UserRole.Customer,
        otpCode: otp,
        expiresAt: new Date(expiresAt),
      },
    });

    return { phone: payload.phone, otp, status: "new" };
  }
  if (user.status === "Blocked") {
    throw new ApiError(
      400,
      "Your account is blocked, please contact Admin or super Admin"
    );
  }

  const otp = generateOTP(); // 4-digit OTP
  // let otp ; // 4-digit OTP

  const OTP_EXPIRATION_TIME = 5 * 60 * 1000;
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  await prisma.pendingUser.upsert({
    where: {
      phone: payload.phone,
    },
    update: {
      otpCode: otp,
      expiresAt: new Date(expiresAt),
    },
    create: {
      phone: payload.phone,
      role: UserRole.Customer,
      otpCode: otp,
      expiresAt: new Date(expiresAt),
    },
  });

  return { phone: payload.phone, otp, status: "existing" };
};

const authLoginIntoDB = async (payload: {
  phone: string;
  fcmToken: string;
}) => {
  const user = await prisma.user.findUnique({
    where: {
      phone: payload.phone,
    },
  });
  if (!user) {
    throw new ApiError(404, "User not found, please contact Owner/ superAdmin");
  }
  if (user.status === "Blocked") {
    throw new ApiError(
      400,
      "Your account is blocked, please contact please contact Owner/ superAdmin"
    );
  }

  const otp = generateOTP(); // 4-digit OTP

  const OTP_EXPIRATION_TIME = 5 * 60 * 1000;
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  await prisma.pendingUser.upsert({
    where: {
      phone: payload.phone,
    },
    update: {
      otpCode: otp,
      expiresAt: new Date(expiresAt),
    },
    create: {
      phone: payload.phone,
      otpCode: otp,
      role: user.role,
      expiresAt: new Date(expiresAt),
    },
  });

  return { phone: payload.phone, otp };
};

const getProfileFromDB = async (userId: string) => {
  let user: any = await prisma.user.findUnique({
    where: { id: userId },
    select :{
      id: true,
      fullName: true,
      phone: true,
      role : true,
      email: true,
      profileImage: true,
      address: true,
      isProfileComplete: true,
      isVerifyed  : true,
      branchId : true,
      buyerRating : true,
      status : true,
      agentId : true,
      referralCode : true,
      fcmToken : true,
      shopOpeningTime : true,
      threshold : true,
      discount : true,
      createdAt : true,
      updatedAt : true,
      UserLocation: {
        select :{
          id : true,
          latitude : true,
          longitude : true,
        }
      },
      verificationUsers : true
    }
  });
  if (!user) {
    throw new ApiError(404, "user not found!");
  }
  if(user.agentId){
    user.agentData =  await prisma.user.findUnique({
      where: { id: user.agentId },
      select :{
        id: true,
        fullName: true,
        phone: true,
        email: true,
        profileImage: true,
        address: true,
      }
    });
  }

  const { createdAt, updatedAt, ...sanitizedUser } = user;

  return sanitizedUser;
};

const updateProfileIntoDB = async (
  payload: User,
  userId: string,
  file: Express.Multer.File
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "user not found for edit user");
  }

  if (user.status === "Blocked") {
    throw new ApiError(
      400,
      "Your account is blocked, please contact please contact Owner/ superAdmin"
    );
  }

  let profileImage;

  if (file) {
    profileImage = (await uploadToDigitalOceanAWS(file)).Location;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...payload,
      profileImage: file ? profileImage : user.profileImage,
      isProfileComplete: true,
    },
  });
  return;
};
const userLocationUpdateInDB = async (
  userId: string,
  userLocation: UserLocation
) => {
  await prisma.userLocation.upsert({
    where: {
      userId,
    },
    create: {
      userId,
      longitude: userLocation.longitude,
      latitude: userLocation.latitude,
    },
    update: {
      longitude: userLocation.longitude,
      latitude: userLocation.latitude,
    },
  });

  // need to check which branch is nearest to user location then save this user info that his location is in that branch area
  const branches = await prisma.branch.findMany();
  const nearestBranch = branches.reduce((prev, curr) => {
    const prevDistance = getDistance(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: prev.latitude, longitude: prev.longitude }
    );
    const currDistance = getDistance(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: curr.latitude, longitude: curr.longitude }
    );
    return currDistance < prevDistance ? curr : prev;
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      branchId: nearestBranch.id,
    },
  });

  return;
};

export const authService = {
  buyerLoginIntoDB,
  authLoginIntoDB,
  getProfileFromDB,
  updateProfileIntoDB,
  userLocationUpdateInDB,
};
