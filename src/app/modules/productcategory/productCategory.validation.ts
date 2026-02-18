import * as z from "zod";

const createProductCategorySchema = z.object({
  name: z.string(),
  branchId: z.string(),
});

const createSubcategorySchema = z.object({
  name: z.string(),
});

export const ProductCategorySchemaValidation = {
  createProductCategorySchema,
  createSubcategorySchema,
};
