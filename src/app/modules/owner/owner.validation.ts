import * as z from 'zod';
 
export const createOwnerSchema = z.object({
  name: z.string(),
});
 
export const OwnerSchemaValidation = {
createOwnerSchema
};
  