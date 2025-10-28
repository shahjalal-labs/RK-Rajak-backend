import * as z from "zod";

// Unit enum schema
const unitSchema = z.enum(["KG", "Box", "Punnet", "Tray"]);

// Product Variation Schema
export const productVariationSchema = z.object({
  realPrice: z.number().nonnegative("Real price must be positive"),
  sellingPrice: z.number().nonnegative("Selling price must be positive"),
  availableQuantity: z
    .number()
    .int()
    .nonnegative("Available quantity must be non-negative"),
  minOrderQuantity: z
    .number()
    .int()
    .positive("Minimum order quantity must be positive"),
  maxOrderQuantity: z
    .number()
    .int()
    .positive("Maximum order quantity must be positive"),
  unit: unitSchema,
  weight: z.number().positive("Weight must be positive"),
  productId: z.string().optional(),
});

// Product Schema
export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  tag: z.string().min(1, "Tag is required"),
  categoryId: z.string({required_error: "Category ID is required"}),
  branchId: z.string({
    required_error: "Branch ID is required",
  }),
  productVariations: z.array(productVariationSchema).min(1, "At least one product variation is required"),
});

// Update Product Schema (for PATCH requests)
export const updateProductSchema = z.object({
  name: z.string().min(1, "Product name is required").optional(),
  tag: z.string().min(1, "Tag is required").optional(),
  categoryId: z.string().optional(),
  branchId: z.string().optional(),
  productVariations: z.array(z.object({
    variationId: z.string({required_error: "Variation ID is required"}),
    realPrice: z.number().nonnegative("Real price must be positive").optional(),
    sellingPrice: z.number().nonnegative("Selling price must be positive").optional(),
    availableQuantity: z
      .number()
      .int()
      .nonnegative("Available quantity must be non-negative")
      .optional(),
    minOrderQuantity: z
      .number()
      .int()
      .positive("Minimum order quantity must be positive")
      .optional(),
    maxOrderQuantity: z
      .number()
      .int()
      .positive("Maximum order quantity must be positive")
      .optional(),
    unit: unitSchema.optional(),
    weight: z.number().positive("Weight must be positive").optional(),
  })).optional(),
});

export const ProductSchemaValidation = {
  createProductSchema,
  updateProductSchema,
  productVariationSchema,
};