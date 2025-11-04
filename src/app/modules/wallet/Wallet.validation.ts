import * as z from 'zod';
 
export const createWalletSchema = z.object({
  name: z.string(),
});
 
export const WalletSchemaValidation = {
createWalletSchema
};
  