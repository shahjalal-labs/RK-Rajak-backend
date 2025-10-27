import * as z from 'zod';
 
export const createLivePhotoSchema = z.object({
  name: z.string(),
});
 
export const LivePhotoSchemaValidation = {
createLivePhotoSchema
};
  