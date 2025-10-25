import express from "express";
import { contactControllers } from "./contact.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createContactSchema } from "./contact.validation";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/",
  validateRequest(createContactSchema),
  contactControllers.createContact
);
router.get("/", auth(UserRole.Admin), contactControllers.getAllContacts);
router.get("/:id", auth(UserRole.Admin), contactControllers.getContactById);
router.patch("/:id", contactControllers.updateContact);
router.delete("/:id", contactControllers.deleteContact);

export const contactRoutes = router;
