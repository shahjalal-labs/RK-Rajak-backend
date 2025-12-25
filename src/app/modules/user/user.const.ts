import { UserRole } from "@prisma/client";

export type userCreationByOwner = {
  name: string;
  phone: string;
  role: UserRole;
  branchId: string;
};

export type customerForBranchQuery = {
  branchId: string;
  searchTerm: string;
  page: number;
  limit: number;
  statusType:
    | "All"
    | "New"
    | "Active"
    | "Inactive"
    | "reloggedin"
    | "Reactivated"
    | "OneOrderCustomer"
    | "OnlineCustomer"
    | "OfflineCustomer";
};
