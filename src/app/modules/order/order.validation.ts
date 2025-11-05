import * as z from "zod";

// Order product schema
const orderProductSchema = z.object({
  productId: z.string({ required_error: "Product ID is required" }),
  variationId: z.string({ required_error: "Variation ID is required" }),
  quantity: z.number().int().positive("Quantity must be positive"),
});

// Create order schema
export const createOrderSchema = z.object({
  products: z
    .array(orderProductSchema)
    .min(1, "At least one product is required"),
  shippingAddressId: z.string({ required_error: "Shipping address is required" }),
  paymentMethod: z.enum(["COD", "Online", "Wallet"], {
    required_error: "Payment method is required",
  }),
});


// Cancel order schema (supports partial or full cancellation)
export const cancelOrderSchema = z.object({
  orderId: z.string({ required_error: "Order ID is required" }),
  reason: z.string().optional(),
  products: z
    .array(
      z.object({
        orderProductId: z.string({ required_error: "Order product ID is required" }),
        cancelQuantity: z.number().int().positive("Cancel quantity must be positive"),
      })
    )
    .optional(), // If not provided, cancel entire order
});


// Return order schema
export const returnOrderSchema = z.object({
  orderId: z.string({ required_error: "Order ID is required" }),
  products: z
    .array(
      z.object({
        orderProductId: z.string({ required_error: "Order product ID is required" }),
        returnQuantity: z.number().int().positive("Return quantity must be positive"),
      })
    )
    .min(1, "At least one product must be returned"),
  reason: z.string().optional(),
});

// Update order status schema
export const updateOrderStatusSchema = z.object({
  status: z.enum(["Pending", "onTheway", "Delivered", "Cancelled", "PartiallyReturned", "FullyReturned"], {
    required_error: "Status is required",
  }),
});

export const OrderValidation = {
  createOrderSchema,
  cancelOrderSchema,
  returnOrderSchema,
  updateOrderStatusSchema,
};
