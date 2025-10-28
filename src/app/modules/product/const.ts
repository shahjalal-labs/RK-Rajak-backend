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

  // Product Unit Type
export type Unit = "KG" | "Box" | "Punnet" | "Tray";

// Product Variation Interface
export interface IProductVariation {
  realPrice: number;
  sellingPrice: number;
  availableQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  unit: Unit;
  weight: number;
  productId?: string;
}

// Create Product Interface
export interface ICreateProduct {
  name: string;
  tag: string;
  branchId: string;
  categoryId: string;
  productVariations: IProductVariation[];
}

// Update Product Interface (all fields optional)
export interface IUpdateProduct {
  name?: string;
  tag?: string;
  branchId?: string;
  productVariations?: IProductVariation[];
}

// Product Response Interface (if you need it for the complete product with ID)
export interface IProduct extends ICreateProduct {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}