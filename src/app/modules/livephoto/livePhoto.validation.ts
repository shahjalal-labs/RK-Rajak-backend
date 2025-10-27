import * as z from 'zod';
 
export const createLivePhotoSchema = z.object({
  // Define fields
  name: z.string(),
});
 
export const LivePhotoSchemaValidation = {
createLivePhotoSchema
};
  