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

export const WalletServices = {
  getAllWallets,
  getWalletById,
};
