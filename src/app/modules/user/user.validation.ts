import { string, z } from "zod";

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

const userCreateValidation = z.object({
  fullName: string({ required_error: "fullName is required" }),
  phone: string({ required_error: "Phone number is required" }),
  role: z.string({ required_error: "user role is required" }),
  branchId: z.string({ required_error: "Branch ID is required" }),
});

const userRatingValidation = z.object({
  userId: z.string({ required_error: "User ID is required" }),
  rating: z.number({ required_error: "Rating is required" }).min(1).max(5),
  review: z.string().optional(),
});


export const userValidation = {
  buyerLoginValidation,
  authLoginValidation,
  userVerifyValidation,
  userCreateValidation,
  userRatingValidation
};
