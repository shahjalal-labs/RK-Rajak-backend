import * as z from 'zod';
 
export const createLivePhotoCategorySchema = z.object({
  name: z.string(),
  branchId: z.string(),
});
export const updateLivePhotoCategorySchema = z.object({
  name: z.string().optional(),
});
 
export const LivePhotoCategorySchemaValidation = {
  createLivePhotoCategorySchema,
  updateLivePhotoCategorySchema
};
  