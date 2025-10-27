import * as z from "zod";

export const createBranchSchema = z.object({
  name: z.string({ required_error: "Branch name is required" }),
  location: z.string({ required_error: "Branch location is required" }),
  latitude: z.string({ required_error: "Branch latitude is required" }),
  longitude: z.string({ required_error: "Branch longitude is required" }),
  openingTime: z.string({ required_error: "Branch opening time is required" }),
  closingTime: z.string({ required_error: "Branch closing time is required" }),
});

export const BranchSchemaValidation = {
  createBranchSchema,
};
