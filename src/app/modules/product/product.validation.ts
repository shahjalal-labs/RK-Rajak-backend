import * as z from 'zod';
  
// Product Category Schema
export const productCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

// Product Schema
export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string(),
  price: z.number().nonnegative("Price must be positive"),
  quantity: z.number().int().nonnegative().optional(),
  productCategory: z.string(),
  availablity : z.enum(['InStock', 'OutOfStock', 'PreOrder', 'UpComming']).optional(),
  brand : z.string().optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  technicalSpecification: z.any().optional(),
  physicalSpecification: z.any().optional(),
  warrantyInformation: z.any().optional(),
});
export const ProductSchemaValidation = {
createProductSchema,
productCategorySchema
};
