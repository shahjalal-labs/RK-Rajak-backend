import * as z from "zod";

export const createCartValueSchema = z.object({
  branchId: z.string({ required_error: "Branch ID is required" }),
  minValue: z
    .number({ required_error: "Minimum value is required" })
    .nonnegative("Minimum value must be non-negative"),
});

export const updateCartValueSchema = z.object({
  branchId: z.string().optional(),
  minValue: z
    .number()
    .nonnegative("Minimum value must be non-negative")
    .optional(),
});

export const CartValueSchemaValidation = {
  createCartValueSchema,
  updateCartValueSchema,
};
