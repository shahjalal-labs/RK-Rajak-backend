import * as z from "zod";

export const createHandalingChargeSchema = z.object({
  charge: z.number().positive("Charge must be a positive number"),
  condition: z.string().min(1, "Condition is required"),
  branchId: z.string().min(1, "Branch ID is required"),
});

export const updateHandalingChargeSchema = z.object({
  charge: z.number().positive("Charge must be a positive number").optional(),
  condition: z.string().min(1, "Condition is required").optional(),
});

export const HandalingChargeSchemaValidation = {
  createHandalingChargeSchema,
  updateHandalingChargeSchema,
};
