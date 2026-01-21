import { PrismaClient, product, branch, UserRole } from "@prisma/client";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToAWSS3";
import ApiError from "../../../errors/ApiErrors";
import {
  GetAllProductsResponse,
  ICreateProduct,
  UpdateProductPayload,
} from "./const";
import { JwtPayload } from "jsonwebtoken";
const prisma = new PrismaClient();

const createProduct = async (
  data: ICreateProduct,
  productImages: Express.Multer.File[]
) => {
  const { productVariations, ...productData } = data;
  const isCategoryExist = await prisma.productCategory.findFirst({
    where: { id: data.categoryId },
  });
  if (!isCategoryExist) {
    throw new ApiError(404, "Product category not found");
  }
  const isBranchExist = await prisma.branch.findFirst({
    where: { id: data.branchId },
  });
  if (!isBranchExist) {
    throw new ApiError(404, "Branch not found");
  }
  let imagesUpload = [];
  try {
    imagesUpload = await Promise.all(
      productImages.map(async (file: Express.Multer.File) => {
        return (await uploadToDigitalOceanAWS(file)).Location;
      })
    );
  } catch (error: any) {
    console.log({ error });
    throw new ApiError(500, "Failed to upload images: " + error.message);
  }
  const createdProduct = await prisma.product.create({
    data: { ...productData, images: imagesUpload },
  });
  await prisma.productVariation.createMany({
    data: productVariations.map((variation) => ({
      ...variation,
      productId: createdProduct.id,
    })),
  });
  return (await prisma.product.findUnique({
    where: { id: createdProduct.id },
    include: {
      productVariation: true,
      category: true,
      branch: true,
    },
  })) as product;
};

interface GetAllProductsParams {
  page?: number;
  limit?: number;
  sort?: string;
  tag?: string;
  packageType?: "Bulk" | "Mini";
  category?: string;
  subcategory?: string;
  searchTerm?: string;
  status?: boolean | string;
}

const getAllProducts = async (
  query: GetAllProductsParams,
  branchId: string
) => {
  const {
    page = 1,
    limit = 10,
    sort = "-createdAt",
    tag,
    category,
    subcategory,
    packageType,
    searchTerm,
    status,
  }: GetAllProductsParams = query;

  // Calculate pagination
  const skip: number = (page - 1) * limit;

  // Build where conditions
  const where: any = { branchId };

  // Price range filter (based on productVariation)
  // Tag filter
  if (tag) {
    where.tag = tag;
  }
  // Status filter
  if (status !== undefined) {
    where.status = status === true || status === "true";
  }

  if (category && subcategory) {
    where.category = {
      name: category,
      productSubcategory: {
        some: {
          name: subcategory,
        },
      },
    };
  } else if (category) {
    where.category = {
      name: category,
    };
  }

  // Search in name
  if (searchTerm) {
    where.name = { contains: searchTerm, mode: "insensitive" };
    where.tag = { contains: searchTerm, mode: "insensitive" };
  }

  if (packageType) {
    where.packageType = packageType;
  }

  // Sort order
  const orderBy: any = {};
  if (sort) {
    const [field, direction] = sort.startsWith("-")
      ? [sort.substring(1), "desc"]
      : [sort, "asc"];
    orderBy[field] = direction;
  }

  // Fetch data with pagination
  const result = await prisma.product.findMany({
    where,
    orderBy,
    skip,
    take: Number(limit),
    include: {
      productVariation: true,
      category: {
        include: {
          productSubcategory: true,
        },
      },
      branch: true,
    },
  });

  // Count total for pagination metadata
  const totalCount = await prisma.product.count({ where });

  const response: GetAllProductsResponse = {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
    },
    result,
  };

  return response;
};
const getAllProductsForBuyer = async (
  query: GetAllProductsParams,
  user: JwtPayload
) => {
  const {
    page = 1,
    limit = 10,
    sort = "-createdAt",
    tag,
    category,
    subcategory,
    searchTerm,
    status,
    packageType,
  }: GetAllProductsParams = query;

  // Calculate pagination
  const skip: number = (page - 1) * limit;

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: { branch: true },
  });

  if (!userData || !userData.branch) {
    throw new ApiError(
      400,
      "you are not assigned to any branch. please contact with Owner"
    );
  }
  // Build where conditions
  const where: any = { branchId: userData.branchId, status: true };

  // Price range filter (based on productVariation)
  // Tag filter
  if (tag) {
    where.tag = tag;
  }
  // Status filter
  if (status !== undefined) {
    where.status = status === true || status === "true";
  }

  if (category && subcategory) {
    where.category = {
      name: category,
      productSubcategory: {
        some: {
          name: subcategory,
        },
      },
    };
  } else if (category) {
    where.category = {
      name: category,
    };
  }
  // Search in name
  if (searchTerm) {
    where.name = { contains: searchTerm, mode: "insensitive" };
    where.tag = { contains: searchTerm, mode: "insensitive" };
  }

  if (packageType) {
    where.packageType = packageType;
  }

  // Sort order
  const orderBy: any = {};
  if (sort) {
    const [field, direction] = sort.startsWith("-")
      ? [sort.substring(1), "desc"]
      : [sort, "asc"];
    orderBy[field] = direction;
  }

  // Fetch data with pagination
  const result = await prisma.product.findMany({
    where,
    orderBy,
    skip,
    take: Number(limit),
    include: {
      productVariation: {
        omit: {
          realPrice: true,
          productId: true,
        },
      },
      // category: {
      //   include: {
      //     productSubcategory: true,
      //   },
      // },
    },
  });

  // Count total for pagination metadata
  const totalCount = await prisma.product.count({ where });

  const response: GetAllProductsResponse = {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
    },
    result,
  };

  return response;
};

const getProductById = async (id: string, user: JwtPayload) => {
  const userRole = user.role;
  if (userRole === UserRole.Customer) {
    const productData = await prisma.product.findUnique({
      where: { id },
      include: {
        productVariation: {
          omit: {
            realPrice: true,
            productId: true,
          },
        },
        category: {
          include: {
            productSubcategory: true,
          },
        },
      },
    });
    if (!productData) {
      throw new ApiError(404, "Product not found");
    }
    return productData;
  }
  const res = await prisma.product.findUnique({
    where: { id },
    include: {
      productVariation: true,
      category: true,
      branch: true,
    },
  });
  if (!res) {
    throw new ApiError(404, "Product not found");
  }
  return res;
};

const updateProduct = async (
  id: string,
  data: UpdateProductPayload,
  productImages?: Express.Multer.File[]
) => {
  const { productVariations, ...productData } = data;
  const isProductExist = await prisma.product.findUnique({
    where: {
      id,
    },
  });
  if (!isProductExist) {
    throw new ApiError(404, "Product not found");
  }

  // Validate categoryId if provided
  if (data.categoryId) {
    const isCategoryExist = await prisma.productCategory.findFirst({
      where: { id: data.categoryId },
    });
    if (!isCategoryExist) {
      throw new ApiError(404, "Product category not found");
    }
  }

  // Validate branchId if provided
  if (data.branchId) {
    const isBranchExist = await prisma.branch.findFirst({
      where: { id: data.branchId },
    });
    if (!isBranchExist) {
      throw new ApiError(404, "Branch not found");
    }
  }

  let imagesUpload = isProductExist.images;
  if (productImages && productImages.length > 0) {
    try {
      imagesUpload = await Promise.all(
        productImages.map(async (file: Express.Multer.File) => {
          return (await uploadToDigitalOceanAWS(file)).Location;
        })
      );
    } catch (error: any) {
      throw new ApiError(500, "Failed to upload images: " + error.message);
    }
  }
  await prisma.product.update({
    where: { id },
    data: { ...productData, images: imagesUpload },
  });
  // Update product variations if provided
  if (productVariations && productVariations.length > 0) {
    for (const variation of productVariations) {
      const { variationId, ...variationData } = variation;
      const isVariationExist = await prisma.productVariation.findUnique({
        where: { id: variationId },
      });
      if (!isVariationExist) {
        throw new ApiError(
          404,
          `Product variation with ID ${variationId} not found`
        );
      }
      await prisma.productVariation.update({
        where: { id: variationId },
        data: { ...variationData },
      });
    }
  }
  return (await prisma.product.findUnique({
    where: { id },
    include: {
      productVariation: true,
      category: true,
      branch: true,
    },
  })) as product;
};

const bestSelling = async (query: any) => {
  return await prisma.product.findMany({
    // i want to return those products which have been sold the most in delivered orders and sort them in descending order
    orderBy: {
      orderProducts: {
        _count: "desc",
      },
    },
    where: {
      orderProducts: {
        some: {
          order: {
            status: "Delivered",
          },
        },
      },
    },
    include : {
      category: true,
      productVariation: true,
      
    }
  });
};

const deleteProduct = async (id: string) => {
  const isExist = await prisma.product.findUnique({
    where: {
      id,
    },
  });
  if (!isExist) {
    throw new ApiError(404, "Product not found");
  }
  return await prisma.product.delete({ where: { id } });
};

export const productServices = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bestSelling,
  getAllProductsForBuyer,
};
