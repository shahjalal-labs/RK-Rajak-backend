import * as z from 'zod';
 
export const createBannerSchema = z.object({
  name: z.string(),
});
 
export const BannerSchemaValidation = {
createBannerSchema
};
  