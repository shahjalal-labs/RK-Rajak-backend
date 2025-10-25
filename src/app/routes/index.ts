import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoute } from "../modules/auth/auth.routes";
import reviewRouter from "../modules/review/review.routes";
// import { productRoutes } from "../modules/product/product.routes";
import { shippingAddressRoutes } from "../modules/shippingaddress/shippingAddress.routes";
// import { orderPaymentRoutes } from "../modules/orderpayment/orderPayment.routes";
import { contactRoutes } from "../modules/contact/contact.routes";

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
  // {
  //   path: "/products",
  //   route: productRoutes,
  // },
  {
    path: "/review",
    route: reviewRouter,
  },
  {
    path: "/shippingAddress",
    route: shippingAddressRoutes,
  },
  // {
  //   path: "/order",
  //   route: orderPaymentRoutes,
  // },
  {
    path: "/contact",
    route: contactRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
