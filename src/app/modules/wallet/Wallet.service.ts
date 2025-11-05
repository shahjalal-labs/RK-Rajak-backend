import { PrismaClient, Wallet } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
const prisma = new PrismaClient();

const rechargeBalance = async (userId: string , payload : {amount : number}) => {
  const existingWallet = await prisma.wallet.findFirst({ where: { userId } })!;
  const { amount } = payload;

  //! TODO :----- // make it using payment gateway later 

  //iam sure evryone has wallet 
  existingWallet!.balance += amount;
  await prisma.wallet.update({
    where: { id: existingWallet!.id },
    data: { balance: existingWallet!.balance },
  });

  // save it in wallet transactions 
  await prisma.walletTransaction.create({
    data: {
      walletId: existingWallet!.id,
      amount: amount,
      type: "Credit",
    },
  });

  return existingWallet;
};
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
  rechargeBalance,
  getAllWallets,
  getWalletById,
};
