import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoute } from "../modules/auth/auth.routes";
import reviewRouter from "../modules/review/review.routes";
import { shippingAddressRoutes } from "../modules/shippingaddress/shippingAddress.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { branchRoutes } from "../modules/branch/branch.routes";

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
