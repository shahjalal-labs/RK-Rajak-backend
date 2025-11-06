export interface IWalletRechargePayload {
  userId: string;
  amount: number;
}

export interface IDuesPaymentPayload {
  userId: string;
  orderIds: string[]; // Can clear specific orders or all
  amount: number;
}
