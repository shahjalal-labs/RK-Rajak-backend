import express from "express";
import { spinControllers } from "./spin.controller";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post("/", auth(), spinControllers.setupSpinValues);
router.post("/recharge-by-spin", auth(), spinControllers.rechargeBySpin);

router.get(
  "/customer",
  auth(),
  spinControllers.getCurrentMonthSpinValuesForcustomer,
);

router.get(
  "/:branchId",
  auth(),
  spinControllers.getCurrentMonthSpinValuesForAdmins,
);

router.get("/:id", auth(), spinControllers.getSpinById);
router.patch("/:id", auth(), spinControllers.updateSpin);
router.delete("/:id", auth(), spinControllers.deleteSpin);

export const spinRoutes = router;
