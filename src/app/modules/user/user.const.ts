import { UserRole } from "@prisma/client";

export type userCreationByOwner = {
  name: string;
  phone: string;
  role: UserRole;
  branchId: string;
};
