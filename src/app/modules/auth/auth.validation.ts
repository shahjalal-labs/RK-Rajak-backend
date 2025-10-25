import { z } from "zod";

const authLoginSchema = z.object({
  phone: z.string({
    required_error: "Phone number is required",
  }).min(10, "Phone number must be at least 10 characters long"),
  })

export const authValidation = {
  authLoginSchema,
};
