import { PrismaClient, product, productCategory } from "@prisma/client";
import { uploadToDigitalOceanAWS } from "../../../helpers/uploadToDigitalOceanAWS";
import ApiError from "../../../errors/ApiErrors";
import { GetAllProductsResponse } from "./const";
const prisma = new PrismaClient();

const createProduct = async (
  data: product,
  productImages: Express.Multer.File[]
) => {
  const isCategoryExist = await prisma.productCategory.findFirst({
    where: { name: data.productCategory },
  });
  if (!isCategoryExist) {
    await prisma.productCategory.create({
      data: { name: data.productCategory },
    });
  }
  const isBrandExist = await prisma.productBrand.findFirst({
    where: { name: data.brand },
  });
  if (!isBrandExist) {
    await prisma.productBrand.create({
      data: {
        name: data.brand,
      },
    });
  }
  let imagesUpload = [];
  try {
    imagesUpload = await Promise.all(
      productImages.map(async (file: Express.Multer.File) => {
        return (await uploadToDigitalOceanAWS(file)).Location;
      })
    );
  } catch (error: any) {
    throw new ApiError(500, "Failed to upload images: " + error.message);
  }
  return await prisma.product.create({
    data: { ...data, images: imagesUpload },
  });
};

interface GetAllProductsParams {
  page?: number;
  limit?: number;
  startPrice?: number;
  endPrice?: number;
  sort?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder" | "UpComing";
  brand?: string;
  productCategory?: string;
  searchTerm?: string;
}

const getAllProducts = async (query: GetAllProductsParams) => {
  const {
    page = 1,
    limit = 10,
    startPrice,
    endPrice,
    sort = "-createdAt",
    availability,
    brand,
    productCategory,
    searchTerm,
  }: GetAllProductsParams = query;

  // Calculate pagination
  const skip: number = (page - 1) * limit;

  // Build where conditions
  const where: any = {};

  // Price range filter
  if (startPrice !== undefined || endPrice !== undefined) {
    where.price = {};
    if (startPrice !== undefined) {
      where.price.gte = Number(startPrice);
    }
    if (endPrice !== undefined) {
      where.price.lte = Number(endPrice);
    }
  }

  // Availability filter
  if (availability) {
    where.availability = availability;
    console.log(availability);
  }

  // Brand filter
  if (brand) {
    where.brand = brand;
  }

  // Product category filter
  if (productCategory) {
    where.productCategory = productCategory;
  }

  // Search in name or description
  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
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

const getProductById = async (id: string) => {
  const res = await prisma.product.findUnique({
    where: { id },
    include: {
      reviews: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });
  if (!res) {
    throw new ApiError(404, "Product not found");
  }
  return res;
};

const updateProduct = async (
  id: string,
  data: Partial<product>,
  productImages: Express.Multer.File[]
) => {
  const isProductExist = await prisma.product.findUnique({
    where: {
      id,
    },
  });
  if (!isProductExist) {
    throw new ApiError(404, "Product not found");
  }
  const isCategoryExist = await prisma.productCategory.findFirst({
    where: { name: data.productCategory },
  });
  if (!isCategoryExist && data.productCategory) {
    await prisma.productCategory.create({
      data: { name: data.productCategory },
    });
  }
  const isBrandExist = await prisma.productBrand.findFirst({
    where: { name: data.brand },
  });
  if (!isBrandExist && data.brand) {
    await prisma.productBrand.create({
      data: {
        name: data.brand,
      },
    });
  }

  let imagesUpload = isProductExist.images;
  if (productImages) {
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
  return await prisma.product.update({
    where: { id },
    data: { ...data, images: imagesUpload },
  });
};

const bestSelling = async () => {
  return await prisma.product.findMany({
    where: {
      orderProduct: {
        some: {
          order: {
            status: "Delivered",
          },
        },
      },
    },
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
};