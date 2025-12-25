import { PrismaClient, Spin } from '@prisma/client';
import ApiError from '../../../errors/ApiErrors';
import httpStatus from 'http-status';
import { sendSingleNotification } from '../notifications/notification.services';
const prisma = new PrismaClient();

const setupSpinValues = async (data: {branchId : string , spinValue: number}) => {
  const branchId = data.branchId;

  const isBrachExist = await prisma.branch.findUnique({ where: { id: branchId } });
  if(!isBrachExist){
    throw new ApiError(httpStatus.NOT_FOUND, " Branch not found");
  }

  // Get current date, month and year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  // Create start and end of current month for date range query
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  // Find existing spin value for the current month and year
  const existingSpinValue = await prisma.spinValue.findFirst({
    where: {
      branchId,
      month: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      year: currentYear,
    },
  });

  let spinData;

  if (existingSpinValue) {
    // Update existing record
    spinData = await prisma.spinValue.update({
      where: {
        id: existingSpinValue.id,
      },
      data: {
        spinValue: data.spinValue,
      },
    });
  } else {
    // Create new record
    spinData = await prisma.spinValue.create({
      data: {
        branchId: data.branchId,
        spinValue: data.spinValue,
        month: startOfMonth,
        year: currentYear,
      },
    });
  }
  
  return spinData;
};

const getCurrentMonthSpinValuesForcustomer = async (customerId: string) => {

  const customer = await prisma.user.findUnique({ where: { id: customerId , role :"Customer" } });
  if(!customer){
    throw new ApiError(httpStatus.NOT_FOUND, " account not found, please try again");
  }
  const branchId = customer.branchId;
  if(!branchId){
    throw new ApiError(httpStatus.NOT_FOUND, " Customer is not assigned to any branch");
  }
  // Get current date, month and year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  // Create start and end of current month for date range query
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  const spinData = await prisma.spinValue.findFirst({
    where: {
      branchId,
      month: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  if(!spinData){
    throw new ApiError(httpStatus.NOT_FOUND, "No spin value found for the current month ! please setup first");
  }

  return {
    branchId : spinData?.branchId,
    date : spinData?.month,
    spinValue: spinData?.spinValue
  };
};
const getCurrentMonthSpinValuesForAdmins = async (branchId: string) => {

  const isBranchExist = await prisma.branch.findUnique({ where: { id: branchId } });
  if(!isBranchExist){
    throw new ApiError(httpStatus.NOT_FOUND, " Branch not found");
  }
  // Get current date, month and year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  // Create start and end of current month for date range query
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  const spinData = await prisma.spinValue.findFirst({
    where: {
      branchId,
      month: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  if(!spinData){
    throw new ApiError(httpStatus.NOT_FOUND, "No spin value found for the current month ! please setup first");
  }

  return {
    branchId : spinData?.branchId,
    date : spinData?.month,
    spinValue: spinData?.spinValue
  };
};

const rechargeBySpins = async (userId: string , payload : {wonAmount : number}) => {
  const existingWallet = await prisma.wallet.findFirst({ where: { userId } })!;
  const { wonAmount } = payload;

  //iam sure evryone has wallet 
  existingWallet!.balance += wonAmount;
  await prisma.wallet.update({
    where: { id: existingWallet!.id },
    data: { balance: existingWallet!.balance },
  });

  // save it in wallet transactions 
  await prisma.walletTransaction.create({
    data: {
      walletId: existingWallet!.id,
      amount: wonAmount,
      type: "Credit",
    },
  });

  // Send notification about spin reward
  try {
    await sendSingleNotification(
      userId,
      `Congratulations! You won ₹${wonAmount} from the spin! The amount has been added to your wallet.`,
      undefined,
      "Spin Reward Won 🎉"
    );
  } catch (error) {
    console.error("Failed to send spin reward notification:", error);
  }

  return existingWallet;
};

const getSpinById = async (id: string) => {
  const res = await prisma.spin.findUnique({ where: { id } });
  if(!res){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
};

const updateSpin = async (id: string, data: Partial<Spin>) => {
  const isExist = await prisma.spin.findUnique({ where: { id } });
  if(!isExist){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
  return await prisma.spin.update({ where: { id }, data });
};

const deleteSpin = async (id: string) => {
  const isExist = await prisma.spin.findUnique({ where: { id } });
  if(!isExist){
    throw new ApiError(httpStatus.NOT_FOUND, " No data found");
  }
  return await prisma.spin.delete({ where: { id } });
};

export const spinServices = {
  setupSpinValues,
  getCurrentMonthSpinValuesForcustomer,
  getCurrentMonthSpinValuesForAdmins,
  rechargeBySpins,
  getSpinById,
  updateSpin,
  deleteSpin,
}
  