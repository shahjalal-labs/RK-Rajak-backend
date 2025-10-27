import * as z from 'zod';
 
export const createLivePhotoCategorySchema = z.object({
  // Define fields
  name: z.string(),
});
 
export const LivePhotoCategorySchemaValidation = {
createLivePhotoCategorySchema
};
  