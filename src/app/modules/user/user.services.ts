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
import {
  initializeProgressForNewDriver,
  initializeProgressForNewAgent,
} from "../incentives/incentives.helper";
import { sendSingleNotification } from "../notifications/notification.services";

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
    // update his login track
    await prisma.userAccess.upsert({
      where: { userId: isExistingUser.id },
      create: {
        userId: isExistingUser.id,
        isLoggedIn: true,
        loginAt: new Date(),
        logoutAt: null,
      },
      update: {
        isLoggedIn: true,
        loginAt: new Date(),
        logoutAt: null,
      },
    });
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

  await prisma.userAccess.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      isLoggedIn: true,
      loginAt: new Date(),
      logoutAt: null,
    },
    update: {
      isLoggedIn: true,
      loginAt: new Date(),
      logoutAt: null,
    },
  });

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
    throw new ApiError(409, "Admin/SuperAdmin Or Owner Not Found in Pending Users!");
  }

  const { otpCode, expiresAt } = userPending;

  if (otp !== otpCode) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    // OTP has expired
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
      Wallet: true,
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

// const getCustomersForBranch = async (query: {
//   branchId: string;
//   searchTerm: string;
//   page: number;
//   limit: number;
//   statusType:
//     | "All"
//     | "Active"
//     | "Inactive"
//     | "New"
//     | "reloggedin"
//     | "Reactivated"
//     | "OneOrderCustomer"
//     | "OnlineCustomer"
//     | "OfflineCustomer"
//     | "NoOrderCustomer";
// }) => {
//   const page = Number(query.page) || 1;
//   const limit = Number(query.limit) || 10;
//   const skip = (page - 1) * limit;

//   const tenDaysAgo = new Date();
//   tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

//   let whereCondition: any = {
//     role: "Customer",
//     branchId: query.branchId ?? undefined,
//   };

// whereCondition.OR = [
//   { fullName: { contains: query.searchTerm, mode: "insensitive" } },
//   { phone: { contains: query.searchTerm } },
// ];


//   switch (query.statusType) {
//     case "All":
//       break;

//     case "Active":
//       whereCondition.userAccesses = {
//         some: {
//           isLoggedIn: true,
//         },
//       };
//       break;

//     case "Inactive":
//       whereCondition.userAccesses = {
//         none: {
//           isLoggedIn: true,
//         },
//       };
//       break;

//     case "New":
//       whereCondition = {
//         ...whereCondition,
//         // and signupped last 10 days
//         createdAt: {
//           gte: tenDaysAgo,
//         },
//         dailyOrders: {
//           none: {},
//         },
//       };
//       break;

//     case "OfflineCustomer":
//       whereCondition.agentId = { not: null };
//       break;

//     case "OnlineCustomer":
//       whereCondition.agentId = null;
//       break;

//     case "OneOrderCustomer":
//       whereCondition.dailyOrders = {
//         _count: {
//           equals: 1,
//         },
//       };
//       break;

//       case "NoOrderCustomer":
//         whereCondition.dailyOrders = {
//           none: {},
//         };
//         break;

//     case "reloggedin":
//       whereCondition.userAccesses = {
//         some: {
//           loginAt: { gte: tenDaysAgo },
//           logoutAt: { lte: tenDaysAgo },
//         },
//       };
//       break;

//     case "Reactivated":
//       whereCondition.dailyOrders = {
//         some: {
//           createdAt: { gte: tenDaysAgo },
//         },
//       };
//       whereCondition.userAccesses = {
//         some: {
//           logoutAt: { lte: tenDaysAgo },
//         },
//       };
//       break;
//   }

//   const [customerData, total] = await Promise.all([
//     prisma.user.findMany({
//       where: whereCondition,
//       take: limit,
//       skip: skip,
//       orderBy: {
//         createdAt: "desc",
//       },
//       include: {
//         userAccesses: true,
//         dailyOrders: true,
//       },
//     }),
//     prisma.user.count({
//       where: whereCondition,
//     }),
//   ]);

//   return {
//     meta: {
//       page,
//       limit,
//       total,
//     },
//     result: customerData,
//   };
// };


const getCustomersForBranch = async (query: {
  branchId: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  statusType:
    | "All"
    | "Active"
    | "Inactive"
    | "New"
    | "reloggedin"
    | "Reactivated"
    | "OneOrderCustomer"
    | "OnlineCustomer"
    | "OfflineCustomer"
    | "NoOrderCustomer";
}) => {

//** */ targetted return value for individual customer 
// CustomerName, CustomerImage, AssignedAgent, WalletAmount, PendingAmount, TotalOrders, lastOrderDuration


  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  /** -------------------------
   * Base where condition
   * ------------------------- */
  const whereCondition: any = {
    role: "Customer",
    branchId: query.branchId,
  };

  /** -------------------------
   * Search (OR condition)
   * ------------------------- */
  if (query.searchTerm) {
    whereCondition.OR = [
      { fullName: { contains: query.searchTerm, mode: "insensitive" } },
      { phone: { contains: query.searchTerm } },
    ];
  }

  /** -------------------------
   * OneOrderCustomer handling
   * (groupBy workaround)
   * ------------------------- */
  let oneOrderUserIds: string[] = [];

  if (query.statusType === "OneOrderCustomer") {
    const groupedOrders = await prisma.dailyOrder.groupBy({
      by: ["userId"],
      where: {
        user: {
          role: "Customer",
          branchId: query.branchId,
        },
      },
      having: {
        userId: {
          _count: {
            equals: 1,
          },
        },
      },
    });

    oneOrderUserIds = groupedOrders.map(g => g.userId).filter((id): id is string => id !== null);

    // No users → return empty response early
    if (oneOrderUserIds.length === 0) {
      return {
        meta: {
          page,
          limit,
          total: 0,
        },
        result: [],
      };
    }

    whereCondition.id = {
      in: oneOrderUserIds,
    };
  }

  /** -------------------------
   * Status based filters
   * ------------------------- */
  switch (query.statusType) {
    case "Active":
      whereCondition.userAccesses = {
        some: { isLoggedIn: true },
      };
      break;

    case "Inactive":
      whereCondition.userAccesses = {
        none: { isLoggedIn: true },
      };
      break;

    case "New":
      whereCondition.createdAt = { gte: tenDaysAgo };
      whereCondition.dailyOrders = { none: {} };
      break;

    case "NoOrderCustomer":
      whereCondition.dailyOrders = { none: {} };
      break;

    case "OnlineCustomer":
      whereCondition.agentId = null;
      break;

    case "OfflineCustomer":
      whereCondition.agentId = { not: null };
      break;

    case "reloggedin":
      whereCondition.userAccesses = {
        some: {
          loginAt: { gte: tenDaysAgo },
          logoutAt: { not: null },
        },
      };
      break;

    case "Reactivated":
      whereCondition.AND = [
        {
          dailyOrders: {
            some: { createdAt: { gte: tenDaysAgo } },
          },
        },
        {
          userAccesses: {
            some: { logoutAt: { lte: tenDaysAgo } },
          },
        },
      ];
      break;

    case "All":
    case "OneOrderCustomer":
    default:
      // No additional filtering needed
      break;
  }

  /** -------------------------
   * Query execution with proper includes
   * ------------------------- */
  const [customerData, total] = await Promise.all([
    prisma.user.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        userAccesses: true,
        dailyOrders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            createdAt: true,
          },
        },
        Wallet: {
          select: {
            balance: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.user.count({
      where: whereCondition,
    }),
  ]);

  /** -------------------------
   * Format data with agent information
   * ------------------------- */
  const formattedCustomers = await Promise.all(
    customerData.map(async (customer) => {
      // Get assigned agent if agentId exists
      let assignedAgent = null;
      if (customer.agentId) {
        assignedAgent = await prisma.user.findUnique({
          where: { id: customer.agentId },
          select: {
            id: true,
            fullName: true,
            phone: true,
            profileImage: true,
          },
        });
      }

      // Get total orders count
      const totalOrders = await prisma.dailyOrder.count({
        where: {
          userId: customer.id,
        },
      });

      // Calculate last order duration
      let lastOrderDuration = null;
      if (customer.dailyOrders && customer.dailyOrders.length > 0) {
        const lastOrderDate = customer.dailyOrders[0].createdAt;
        const now = new Date();
        const diffInMs = now.getTime() - new Date(lastOrderDate).getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const diffInHours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (diffInDays > 0) {
          lastOrderDuration = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        } else if (diffInHours > 0) {
          lastOrderDuration = `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        } else {
          lastOrderDuration = "Today";
        }
      }

      return {
        id: customer.id,
        customerName: customer.fullName || "N/A",
        customerImage: customer.profileImage || null,
        phone: customer.phone,
        assignedAgent: assignedAgent
          ? {
              id: assignedAgent.id,
              name: assignedAgent.fullName || "N/A",
              phone: assignedAgent.phone,
              image: assignedAgent.profileImage,
            }
          : null,
        walletAmount: customer.Wallet?.balance || 0,
        pendingAmount: customer.totalDuesAmount || 0,
        totalOrders: totalOrders,
        lastOrderDuration: lastOrderDuration || "No orders yet",
        branch: customer.branch,
      };
    })
  );

  return {
    meta: {
      page,
      limit,
      total,
      statusType: query.statusType || "All",
    },
    result: formattedCustomers,
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

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...payload,
      profileImage: file ? profileImage : user.profileImage,
    },
  });

  // Notify if agent was assigned
  if (payload.agentId && payload.agentId !== user.agentId) {
    try {
      await sendSingleNotification(
        userId,
        `A sales agent has been assigned to your account. They will help you with your orders.`,
        payload.agentId,
        "Agent Assigned"
      );

      // Notify agent about new customer
      await sendSingleNotification(
        payload.agentId,
        `A new customer has been assigned to you: ${updatedUser.fullName || updatedUser.phone}`,
        undefined,
        "New Customer Assigned"
      );
    } catch (error) {
      console.error("Failed to send agent assignment notification:", error);
    }
  }

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

  // =================== AUTO-INITIALIZE INCENTIVE PROGRESS ===================
  // If the new user is a Driver or Agent, initialize their incentive progress
  try {
    if (user.role === UserRole.Driver && user.branchId) {
      await initializeProgressForNewDriver(user.id, user.branchId);
    } else if (user.role === UserRole.Agent && user.branchId) {
      await initializeProgressForNewAgent(user.id, user.branchId);
    }
  } catch (error) {
    console.error("Error initializing incentive progress for new user:", error);
    // Don't fail user creation if incentive initialization fails
  }

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

const getDriverTripsForSuperAdmin = async (query: any) => {
  const {
    startDate,
    endDate,
    branchId,
    searchTerm,
    page = 1,
    limit = 10,
  } = query || {};

  const whereClause: any = {
    role: UserRole.Driver,
  };

  if (searchTerm) {
    whereClause.OR = [
      { fullName: { contains: searchTerm, mode: "insensitive" } },
      { phone: { contains: searchTerm, mode: "insensitive" } },
    ];
  }
  if (branchId) {
    whereClause.branchId = branchId;
  }

  const skip = (page - 1) * limit;

  const drivers = await prisma.user.findMany({
    where: whereClause,
    skip,
    take: Number(limit),
    orderBy: { createdAt: "desc" },
    include: {
      driverAssignments: {
        include: {
          dailyOrder: {
            select: {
              id: true,
              status: true,
              branchId: true,
              orderDate: true,
            },
          },
        },
      },
    },
  });

  const formatted = drivers.map((driver) => {
    let driverOrders = driver.driverAssignments.map((d) => d.dailyOrder);

    if (startDate) {
      const sd = new Date(startDate + "T00:00:00.000Z");
      driverOrders = driverOrders.filter(
        (o) => o?.orderDate && new Date(o.orderDate) >= sd
      );
    }

    if (endDate) {
      const ed = new Date(endDate + "T23:59:59.999Z");
      driverOrders = driverOrders.filter(
        (o) => o?.orderDate && new Date(o.orderDate) <= ed
      );
    }

    const totalTrips = driverOrders.length;
    const deliveredTrips = driverOrders.filter(
      (o) => o?.status === "Delivered"
    ).length;

    // ✔ Order Start Date
    const orderStartDate =
      driverOrders.length > 0
        ? (() => {
            const orderDates = driverOrders
              .map((o) => o?.orderDate)
              .filter((date): date is string => !!date);
            return orderDates.length > 0
              ? new Date(
                  Math.min(
                    ...orderDates.map((date) => new Date(date).getTime())
                  )
                )
              : null;
          })()
        : null;

    // ✔ Order End Date
    const orderEndDate =
      driverOrders.length > 0
        ? (() => {
            const orderDates = driverOrders
              .map((o) => o?.orderDate)
              .filter((date): date is string => !!date);
            return orderDates.length > 0
              ? new Date(
                  Math.max(
                    ...orderDates.map((date) => new Date(date).getTime())
                  )
                )
              : null;
          })()
        : null;

    // ✔ Latest Delivery Date (only delivered ones)
    const deliveredOrderDates = driverOrders
      .filter((o) => o?.status === "Delivered" && o?.orderDate)
      .map((o) => new Date(o?.orderDate as string).getTime());

    const latestDeliveryDate =
      deliveredOrderDates.length > 0
        ? new Date(Math.max(...deliveredOrderDates))
        : null;

    return {
      driverId: driver.id,
      driverName: driver.fullName,
      phone: driver.phone,
      profileImage: driver.profileImage,
      branchId: driver.branchId,

      totalTrips,
      deliveredTrips,

      orderStartDate,
      orderEndDate,
      latestDeliveryDate,
    };
  });

  const totalDrivers = await prisma.user.count({ where: whereClause });

  return {
    metadata: {
      total: totalDrivers,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalDrivers / Number(limit)),
    },
    data: formatted,
  };
};

const getDriverTripsDetailsForSuperAdmin = async (
  query: any,
  driverId: string
) => {
  const { startDate, endDate, page = 1, limit = 10 } = query || {};

  // Verify driver exists
  const driver = await prisma.user.findFirst({
    where: {
      id: driverId,
      role: UserRole.Driver,
    },
  });

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  // Build where clause for date filtering
  const dateFilter: any = {};
  if (startDate) {
    const sd = new Date(startDate + "T00:00:00.000Z");
    dateFilter.gte = sd.toISOString().split("T")[0];
  }
  if (endDate) {
    const ed = new Date(endDate + "T23:59:59.999Z");
    dateFilter.lte = ed.toISOString().split("T")[0];
  }

  const whereClause: any = {
    driverId: driverId,
  };

  if (Object.keys(dateFilter).length > 0) {
    whereClause.dailyOrder = {
      orderDate: dateFilter,
    };
  }

  const skip = (page - 1) * limit;

  // Get driver assignments with full order details
  const assignments = await prisma.driverAssignment.findMany({
    where: whereClause,
    skip,
    take: Number(limit),
    orderBy: { assignedAt: "desc" },
    include: {
      dailyOrder: {
        include: {
          OrderProducts: {
            where: {
              status: {
                not: "Cancelled",
              },
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          shippingAddress: {
            select: {
              shopName: true,
              address: true,
              landmark: true,
            },
          },
        },
      },
    },
  });

  // Format the response
  const formatted = assignments
    .map((assignment) => {
      const order = assignment.dailyOrder;

      if (!order) {
        return null;
      }

      // Calculate delivered products (accepted + partially returned)
      const deliveredProducts = order.OrderProducts.filter(
        (op) => op.acceptedWeight && op.acceptedWeight > 0
      ).map((op) => ({
        productId: op.product?.id,
        productName: op.product?.name,
        weight: op.acceptedWeight,
        quantity: op.acceptedQuantity,
        price: op.acceptedPrice,
      }));

      // Calculate returned products
      const returnedProducts = order.OrderProducts.filter(
        (op) => op.returnedWeight && op.returnedWeight > 0
      ).map((op) => ({
        productId: op.product?.id,
        productName: op.product?.name,
        weight: op.returnedWeight,
        quantity: op.returnedQuantity,
        price: op.returnedPrice,
      }));

      // Calculate total dispatched weight
      const totalDispatchedWeight = order.OrderProducts.reduce(
        (sum, op) => sum + (op.totalWeight || 0),
        0
      );

      // Estimate crates dispatched (assuming 1 crate = 10kg, adjust as needed)
      const cratesDispatched = Math.ceil(totalDispatchedWeight / 10);

      // Parse payment methods
      const paymentMethods: string[] = [];
      if (order.paymentMethod) {
        paymentMethods.push(order.paymentMethod);
      }
      if (order.walletAmountUsed && order.walletAmountUsed > 0) {
        if (!paymentMethods.includes("Wallet")) {
          paymentMethods.push("Wallet");
        }
      }

      // Count delivery proof photos (DeliveryProof could be a single URL or comma-separated URLs)
      const photoCount = order.DeliveryProof
        ? order.DeliveryProof.split(",").filter((url) => url.trim()).length
        : 0;

      return {
        tripNumber: order.id,
        orderDate: order.orderDate,
        driverName: driver.fullName,
        driverId: driver.id,
        customerName: order.user?.fullName,
        customerPhone: order.user?.phone,
        shopName: order.shippingAddress?.shopName,
        address: order.shippingAddress?.address,

        totalDispatch: order.OrderProducts.length,
        totalDispatchedWeight: totalDispatchedWeight,

        deliveredProducts: deliveredProducts,
        returnedProducts: returnedProducts,

        totalAcceptedWeight: order.totalAcceptedWeight || 0,
        totalReturnedWeight: order.totalReturnedWeight || 0,
        totalRejectedWeight: order.totalRejectedWeight || 0,

        cratesDispatched: cratesDispatched,

        totalAmount: order.totalAmount,
        totalAcceptedPrice: order.totalAcceptedPrice || 0,
        totalReturnedPrice: order.totalReturnedPrice || 0,

        paymentMethods: paymentMethods,
        paymentMethod: order.paymentMethod,
        walletAmountUsed: order.walletAmountUsed || 0,
        remainingAmount: order.RemainingAmount || 0,

        deliveryProofPhotos: order.DeliveryProof
          ? order.DeliveryProof.split(",").filter((url) => url.trim())
          : [],
        photoCount: photoCount,

        status: order.status,
        isDues: order.isDues || false,
        duesCleared: order.duesCleared || false,

        assignedAt: assignment.assignedAt,
        actualDeliveryDate: assignment.deliveryDate,
      };
    })
    .filter((item) => item !== null);

  // Count total assignments for pagination
  const totalAssignments = await prisma.driverAssignment.count({
    where: whereClause,
  });

  return {
    metadata: {
      total: totalAssignments,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalAssignments / Number(limit)),
    },
    driver: {
      id: driver.id,
      name: driver.fullName,
      phone: driver.phone,
      profileImage: driver.profileImage,
      branchId: driver.branchId,
    },
    data: formatted,
  };
};

const getSalesAgentPerformanceForSuperAdmin = async (query: any) => {
  const {
    startDate,
    endDate,
    branchId,
    searchTerm,
    page = 1,
    limit = 10,
  } = query || {};

  // Build where clause for agents
  const agentWhereClause: any = {
    role: UserRole.Agent,
  };

  if (searchTerm) {
    agentWhereClause.OR = [
      { fullName: { contains: searchTerm, mode: "insensitive" } },
      { phone: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (branchId) {
    agentWhereClause.branchId = branchId;
  }

  const skip = (page - 1) * limit;

  // Get all agents with pagination
  const agents = await prisma.user.findMany({
    where: agentWhereClause,
    skip,
    take: Number(limit),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      profileImage: true,
      branchId: true,
    },
  });

  // Build date filter for orders
  const orderDateFilter: any = {};
  if (startDate) {
    const sd = new Date(startDate + "T00:00:00.000Z");
    orderDateFilter.gte = sd.toISOString().split("T")[0];
  }
  if (endDate) {
    const ed = new Date(endDate + "T23:59:59.999Z");
    orderDateFilter.lte = ed.toISOString().split("T")[0];
  }

  // Calculate performance for each agent
  const performanceData = await Promise.all(
    agents.map(async (agent) => {
      // Get all customers for this agent
      const customers = await prisma.user.findMany({
        where: {
          agentId: agent.id,
          role: UserRole.Customer,
        },
        select: {
          id: true,
        },
      });

      const customerIds = customers.map((c) => c.id);

      if (customerIds.length === 0) {
        return {
          agentId: agent.id,
          agentName: agent.fullName,
          phone: agent.phone,
          email: agent.email,
          profileImage: agent.profileImage,
          branchId: agent.branchId,
          bookedQty: 0,
          deliveredQty: 0,
          returnsQty: 0,
          cancelQty: 0,
          orders: 0,
          bookedAmt: 0,
          deliveryAmt: 0,
        };
      }

      // Build order where clause
      const orderWhereClause: any = {
        userId: { in: customerIds },
      };

      if (Object.keys(orderDateFilter).length > 0) {
        orderWhereClause.orderDate = orderDateFilter;
      }

      // Get all orders for this agent's customers
      const orders = await prisma.dailyOrder.findMany({
        where: orderWhereClause,
        include: {
          OrderProducts: {
            where: {
              status: {
                not: "Cancelled",
              },
            },
          },
        },
      });

      // Calculate metrics (using weight instead of quantity)
      let bookedQty = 0;
      let deliveredQty = 0;
      let returnsQty = 0;
      let cancelQty = 0;
      let bookedAmt = 0;
      let deliveryAmt = 0;

      orders.forEach((order) => {
        // Booked amount is the total amount
        bookedAmt += order.totalAmount || 0;

        // Delivery amount is the accepted amount
        deliveryAmt += order.totalAcceptedPrice || 0;

        // Calculate weights from OrderProducts
        order.OrderProducts.forEach((product) => {
          // Booked weight
          bookedQty += product.totalWeight || 0;

          // Delivered weight (accepted)
          deliveredQty += product.acceptedWeight || 0;

          // Returns weight
          returnsQty += product.returnedWeight || 0;

          // Cancel/Rejected weight
          cancelQty += product.rejectedWeight || 0;
        });
      });

      return {
        agentId: agent.id,
        agentName: agent.fullName,
        phone: agent.phone,
        email: agent.email,
        profileImage: agent.profileImage,
        branchId: agent.branchId,
        bookedWeight: Math.round(bookedQty),
        deliveredWeight: Math.round(deliveredQty),
        returnsWeight: Math.round(returnsQty),
        cancelWeight: Math.round(cancelQty),
        orders: orders.length,
        bookedAmt: Math.round(bookedAmt),
        deliveryAmt: Math.round(deliveryAmt),
      };
    })
  );

  // Count total agents
  const totalAgents = await prisma.user.count({ where: agentWhereClause });

  return {
    metadata: {
      total: totalAgents,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalAgents / Number(limit)),
    },
    data: performanceData,
  };
};

const logout = async (userId: string) => {
  await prisma.userAccess.updateMany({
    where: {
      userId: userId,
    },
    data: {
      isLoggedIn: false,
      logoutAt: new Date(),
    },
  });
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
  getDriverTripsForSuperAdmin,
  getDriverTripsDetailsForSuperAdmin,
  getSalesAgentPerformanceForSuperAdmin,
  logout,
};
