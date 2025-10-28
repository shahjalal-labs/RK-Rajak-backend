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
export const updateProductSchema = createProductSchema.partial();

export const ProductSchemaValidation = {
  createProductSchema,
  updateProductSchema,
  productVariationSchema,
};