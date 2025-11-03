import * as z from 'zod';
 
export const createAgentAssignmentSchema = z.object({
  name: z.string(),
});
 
export const AgentAssignmentSchemaValidation = {
createAgentAssignmentSchema
};
  