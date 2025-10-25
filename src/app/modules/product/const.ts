import { product } from "@prisma/client";

  export interface GetAllProductsMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }

 export interface GetAllProductsResponse {
    meta: GetAllProductsMeta;
    result: product[];
  }