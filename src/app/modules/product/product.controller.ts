import { productServices } from "./product.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";
import ApiError from "../../../errors/ApiErrors";

const createProduct = catchAsync(async (req, res) => {
  const productImages =
    req.files &&
    (req.files as { [fieldname: string]: Express.Multer.File[] })[
      "productImages"
    ];
  if (!productImages) {
    throw new Error("Product images are required");
  }

  const result = await productServices.createProduct(req.body, productImages);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "The product has been created successfully",
    data: result,
  });
});

const createProductsBulk = catchAsync(async (req, res) => {
  const products = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    throw new ApiError(400, "Products must be a non-empty array");
  }

  if (!Array.isArray(products) || !products.length) {
    throw new ApiError(400, "Products must be a non-empty array");
  }

  /**
   * 2️⃣ Group Images Dynamically
   */
  const files = req.files as Express.Multer.File[];

  const groupedImages: Express.Multer.File[][] = Array.from(
    { length: products.length },
    () => [],
  );

  files?.forEach((file) => {
    const match = file.fieldname.match(/^productImages_(\d+)$/);

    if (match) {
      const index = Number(match[1]);

      if (index >= products.length) {
        throw new ApiError(400, `Image index ${index} exceeds products length`);
      }

      groupedImages[index].push(file);
    }
  });

  /**
   * Optional validation
   */
  groupedImages.forEach((images, index) => {
    if (!images.length) {
      throw new ApiError(
        400,
        `Product at index ${index} must have at least one image`,
      );
    }
  });

  /**
   * 3️⃣ Call Service
   */
  const result = await productServices.createProductsBulk(
    products,
    groupedImages,
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Products have been created successfully",
    data: result,
  });
});

const getAllProducts = catchAsync(async (req, res) => {
  const branchId = req.params.branchId;
  const result = await productServices.getAllProducts(
    { ...req.query },
    branchId,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All products has been retrived successfully",
    data: result,
  });
});

const getAllProductsForBuyer = catchAsync(async (req, res) => {
  const result = await productServices.getAllProductsForBuyer(
    { ...req.query },
    req.user.id,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "All products has been retrived For App successfully",
    data: result,
  });
});

const bestSelling = catchAsync(async (req, res) => {
  const result = await productServices.bestSelling(req.query);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "best selling products has been retrived successfully",
    data: result,
  });
});

const getProductById = catchAsync(async (req, res) => {
  const result = await productServices.getProductById(
    req.params.id,
    req.user.id,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "product has been retrived successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const productImages =
    req.files &&
    (req.files as { [fieldname: string]: Express.Multer.File[] })[
      "productImages"
    ];
  const result = await productServices.updateProduct(
    req.params.id,
    req.body,
    productImages,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "product has been updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  await productServices.deleteProduct(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "product has been deleted successfully",
  });
});

export const productControllers = {
  createProduct,
  createProductsBulk,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  bestSelling,
  getAllProductsForBuyer,
};
