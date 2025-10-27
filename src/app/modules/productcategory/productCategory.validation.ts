import * as z from 'zod';
 
export const createProductCategorySchema = z.object({
  name: z.string(),
  branchId : z.string(),
});
 
export const ProductCategorySchemaValidation = {
createProductCategorySchema
};
  