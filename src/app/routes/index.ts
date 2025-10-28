import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoute } from "../modules/auth/auth.routes";
import reviewRouter from "../modules/review/review.routes";
import { shippingAddressRoutes } from "../modules/shippingaddress/shippingAddress.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { branchRoutes } from "../modules/branch/branch.routes";
import { livePhotoCategoryRoutes } from "../modules/livephotocategory/livePhotoCategory.routes";
import { livePhotoRoutes } from "../modules/livephoto/livePhoto.routes";
import { productCategoryRoutes } from "../modules/productcategory/productCategory.routes";
import { productRoutes } from "../modules/product/product.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/review",
    route: reviewRouter,
  },
  {
    path: "/shippingAddress",
    route: shippingAddressRoutes,
  },
  {
    path: "/contact",
    route: contactRoutes,
  },
  {
    path: "/branch",
    route: branchRoutes,
  },
  {
    path: "/livePhotoCategory",
    route: livePhotoCategoryRoutes,
  },
  {
    path: "/livePhoto",
    route: livePhotoRoutes,
  },
  {
    path: "/productCategory",
    route: productCategoryRoutes,
  },
  {
    path: "/product",
    route: productRoutes,
  },

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
