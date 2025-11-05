export interface IOrderProduct {
  productId: string;
  variationId: string;
  quantity: number;
  price: number;
}

export interface ICreateOrderPayload {
  userId: string;
  products: IOrderProduct[];
  shippingAddressId: string;
  branchId: string;
  paymentMethod: "COD" | "Online" | "Wallet";
}

export interface IReturnOrderPayload {
  orderId: string;
  userId: string;
  products: {
    orderProductId: string;
    returnQuantity: number;
  }[];
  reason?: string;
}

export interface ICancelOrderPayload {
  orderId: string;
  userId: string;
  reason?: string;
  products?: {
    orderProductId: string;
    cancelQuantity: number;
  }[]; // If provided, cancel specific products; if not, cancel entire order
}
