import { User, UserRole, verificationUsers } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import prisma from "../../../shared/prisma";
import generateOTP from "../../../helpers/generateOtp";
import { uploadInSpace } from "../../../shared/UploadHelper";
import getModelKeys from "../../../helpers/getModelKeys";
import QueryBuilder from "../../builder/QueryBuilder";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToDigitalOceanAWS";
import { userCreationByOwner } from "./user.const";
import httpStatus from "http-status";

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
  reffaralCode?: string
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
      status: "existing",
    };
  }

  ///----------- if your not existing user then create new user and calculate othes things ----------///

  // own Otp creation and saving
  const UserReffaralCode = `${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  const user = await prisma.user.create({
    data: {
      phone: phone,
      role: userPending.role as UserRole,
      status: "Active",
      fcmToken: fcmToken ?? "",
      referralCode: UserReffaralCode,
      Wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });


  // reffaralCode calcualte + send money in raffaral useg account and add new user a random rafferal code 6 digit

  if (reffaralCode) {
    const refUser = await prisma.user.findFirst({
      where: { referralCode: reffaralCode },
    });
    if (refUser) {
      await prisma.reffaralUsages.create({
        data: {
          userId: refUser.id,
          usedBy: user.id,
        },
      });
    }
  }
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
    status: "new",
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
    include: {
      dailyOrders: true,
      shippingAddress: true,
      UserLocation: true,
    },
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
      role: {
        notIn: [UserRole.Owner],
      },
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

const getCustomersForBranch = async (query: any, branchId: string) => {
  const keys = await getModelKeys("user");
  const customerQuery = new QueryBuilder(prisma.user, query, keys);
  const result = await customerQuery
    .setCustomWhere({
      role: UserRole.Customer,
      branchId: branchId,
    })
    .search(["fullName", "email"])
    .filter()
    .sort()
    .exclude()
    .include({
      Wallet: true,
      order: true,
      Spin: true,
      //pending ammounts
    })
    .paginate()
    .execute();
  const pagination = await customerQuery.countTotal();
  return {
    meta: pagination,
    result,
  };
};
const getAllAgentsFromDB = async (query: any) => {
  const keys = await getModelKeys("user");
  const agentQuery = new QueryBuilder(prisma.user, query, keys);
  let result;
  if (query.branchId) {
    result = await agentQuery
      // if branchId exist then set branchId condition
      .setCustomWhere({
        role: UserRole.Agent,
        branchId: query.branchId,
      })
      .search(["fullName", "email"])
      .filter()
      .sort()
      .exclude()
      .include({
        Wallet: true,
        order: true,
        Spin: true,
        //pending ammounts
      })
      .paginate()
      .execute();
  } else {
    result = await agentQuery
      // if branchId exist then set branchId condition
      .setCustomWhere({
        role: UserRole.Agent,
      })
      .search(["fullName", "email"])
      .filter()
      .sort()
      .exclude()
      .include({
        Wallet: true,
        order: true,
        Spin: true,
        //pending ammounts
      })
      .paginate()
      .execute();
  }

  const pagination = await agentQuery.countTotal();
  return {
    meta: pagination,
    result,
  };
};

//!TODO : optimize this function with delivery boy total orders total earnings etc
const getAllDriversFromDB = async (query: any) => {
  const keys = await getModelKeys("user");
  const driverQuery = new QueryBuilder(prisma.user, query, keys);
  const result = await driverQuery
    // if branchId exist then set branchId condition
    .setCustomWhere({
      role: UserRole.Driver,
      branchId: query.branchId || undefined,
    })
    .search(["fullName", "email"])
    .filter()
    .sort()
    .exclude()
    .paginate()
    .execute();

  const pagination = await driverQuery.countTotal();
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
      userId: userId,
      buyerName: payload.buyerName,
      buyerPhoto: buyerPhotoUrl,
      shopName: payload.shopName,
      shopPhoto: shopPhotoUrl,
      documents: uploadFiles,
    },
  });
  return;
};

const userCreateByOwner = async (payload: userCreationByOwner) => {
  const isUserPhone = await prisma.user.findFirst({
    where: {
      phone: payload.phone,
    },
  });
  if (isUserPhone) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Phone number is already used for- ${isUserPhone.fullName}. please provide a different phone number`
    );
  }
  const isBranchExist = await prisma.branch.findUnique({
    where: {
      id: payload.branchId,
    },
  });
  if (!isBranchExist) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Branch is is wrong. please provide a valid branch id"
    );
  }
  const user = await prisma.user.create({
    data: {
      ...payload,
      status: "Active",
    },
  });
  return user;
};

const getMyCustomersFromDB = async (query: any, userId: string) => {
  const keys = await getModelKeys("user");
  const customerQuery = new QueryBuilder(prisma.user, query, keys);
  const result = await customerQuery
    .setCustomWhere({
      role: UserRole.Customer,
      agentId: userId,
    })
    .search(["fullName", "email"])
    .filter()
    .sort()
    .paginate()
    .execute();

  const pagination = await customerQuery.countTotal();
  return {
    meta: pagination,
    result,
  };
};

const rateUser = async (payload: {
  userId: string;
  rating: number;
  review?: string;
}) => {
  const { userId, rating, review } = payload;

  await prisma.$transaction(async (tx) => {
    // 1) Check user exists & is Customer
    const user = await tx.user.findFirst({
      where: { id: userId, role: UserRole.Customer },
    });

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    // 2) Create review
    await tx.review.create({
      data: {
        userId,
        rating,
        comment: review || "",
      },
    });

    // 3) Aggregate: get average rating directly from DB (fastest)
    const { _avg } = await tx.review.aggregate({
      where: { userId },
      _avg: { rating: true },
    });

    // 4) Update user with average rating
    await tx.user.update({
      where: { id: userId },
      data: {
        buyerRating: _avg.rating ? parseFloat(_avg.rating.toFixed(2)) : 0,
      },
    });
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
  userCreateByOwner,
  getCustomersForBranch,
  getAllAgentsFromDB,
  getMyCustomersFromDB,
  getAllDriversFromDB,
  rateUser,
};
