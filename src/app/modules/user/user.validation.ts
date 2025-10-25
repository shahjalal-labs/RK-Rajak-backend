import { z } from "zod";

const buyerLoginValidation = z.object({
  phone: z
    .string({
      required_error: "Phone number is required",
    })
    .min(10, "Phone number must be at least 10 characters long"),
  otp: z.string({
    required_error: "OTP is required",
  }),
  fcmToken: z.string().optional(),
  referralCode: z.string().optional(),
});

const authLoginValidation = z.object({
  phone: z
    .string({
      required_error: "Phone number is required",
    })
    .min(10, "Phone number must be at least 10 characters long"),
  otp: z.string({
    required_error: "OTP is required",
  }),
  fcmToken: z.string().optional(),
});

const userVerifyValidation = z.object({
  buyerName: z.string({ required_error: "Buyer name is required" }),
  shopName: z.string({ required_error: "Shop name is required" }),
});

export const userValidation = {
  buyerLoginValidation,
  authLoginValidation,
  userVerifyValidation,
};
