import * as z from 'zod';
 
export const createSpinSchema = z.object({
  name: z.string(),
});
 
export const SpinSchemaValidation = {
createSpinSchema
};
  