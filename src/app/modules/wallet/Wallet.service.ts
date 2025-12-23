import { PrismaClient, Wallet } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
const prisma = new PrismaClient();

// NOTE: Wallet recharge is now handled by Payment module using Cashfree gateway
// Use POST /payment/wallet/recharge endpoint for recharging wallet

const getAllWallets = async () => {
  return await prisma.wallet.findMany();
};
const getWalletById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id, role: "Customer" },
  });
  const waletBalance = await prisma.wallet.findFirst({ where: { userId: id } });
  if (!user) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      " User not found or not a customer"
    );
  }
  if (!waletBalance) {
    throw new ApiError(httpStatus.NOT_FOUND, " Wallet not found for this user");
  }
  const lastTransaction = await prisma.walletTransaction.findMany({
    where: { walletId: waletBalance.id },
    orderBy: { createdAt: "desc" },
  });

  return {
    availableBalance: waletBalance.balance,
    lastTransaction: lastTransaction[0] || null,
    "All transactions using wallet": lastTransaction,
  };
};

const getWalletTransactionForSuperAdmin = async (filters: any) => {
  const {
    page = 1,
    limit = 10,
    branchId,
    startDate,
    endDate,
    agentId,
  } = filters;

  const whereClause: any = {
    AND: [],
  };

  // Filter by branch
  if (branchId) {
    whereClause.AND.push({
      wallet: {
        user: {
          branchId: branchId,
        },
      },
    });
  }

  if (agentId) {
    const isAgentExists = await prisma.user.findFirst({
      where: { id: agentId, role: "Agent" },
    });

    if (!isAgentExists) {
      throw new ApiError(httpStatus.NOT_FOUND, "Agent not found");
    }

    whereClause.AND.push({
      wallet: {
        user: {
          agentId: agentId,
        },
      },
    });
  }

  // Full day date range filter
  if (startDate || endDate) {
    whereClause.AND.push({
      createdAt: {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000Z`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      },
    });
  }

  const skip = (Number(page) - 1) * Number(limit);

  // Total count for pagination UI
  const totalCount = await prisma.walletTransaction.count({
    where: whereClause,
  });

  // Main query with pagination
  const transactions = await prisma.walletTransaction.findMany({
    where: whereClause,
    include: {
      wallet: {
        select: {
          user: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
              branchId: true,
              agentId: true,
            },
          },
        },
      },
    },
    skip,
    take: Number(limit),
    orderBy: { createdAt: "desc" },
  });

  const agentIds = [
  ...new Set(
    transactions
      .map(t => t.wallet?.user?.agentId)
      .filter((id): id is string => Boolean(id))
  ),
];

const agents = await prisma.user.findMany({
  where: { id: { in: agentIds } },
  select: { id: true, fullName: true, profileImage: true },
});

const agentMap = Object.fromEntries(
  agents.map(a => [a.id, a])
);

const finalData = transactions.map(t => ({
  ...t,
  salesAgent: t.wallet?.user?.agentId
    ? agentMap[t.wallet.user.agentId]
    : null,
}));

  return {
    metadata: {
      page: Number(page),
      limit: Number(limit),
      totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
    },
    data: finalData,
  };
};

const getTotalWalletUsagesForSuperAdmin = async (filters: any) => {
  const { branchId, startDate, endDate } = filters;

  const whereClause: any = {};

  // Filter by branch
  if (branchId) {
    whereClause.wallet = {
      user: { branchId: branchId ? branchId : undefined },
    };
  }

  // Full day date range filter
  if (startDate) {
    whereClause.createdAt = {
      ...(whereClause.createdAt || {}),
      gte: new Date(startDate + "T00:00:00.000Z"),
    };
  }

  if (endDate) {
    whereClause.createdAt = {
      ...(whereClause.createdAt || {}),
      lte: new Date(endDate + "T23:59:59.999Z"),
    };
  }

  const totalUsages = await prisma.walletTransaction.aggregate({
    where: { type: "Debit", ...whereClause },
    _count: { id: true },
    _sum: {
      amount: true,
    },
  });

  return {
    totalUsages: {
      count: totalUsages._count.id,
      totalAmount: totalUsages._sum.amount || 0,
    },
  };
};

export const WalletServices = {
  getAllWallets,
  getWalletById,
  getWalletTransactionForSuperAdmin,
  getTotalWalletUsagesForSuperAdmin,
};
