import { Router } from "express";
import {
  submitContactMessage,
  getContactMessages,
  markMessageRead,
  deleteContactMessage,
} from "../controllers/contactController";
import { protect, authorize } from "../middleware/auth";
import { contactLimiter } from "../middleware/rateLimit";

const router = Router();
const canManageMessages = authorize("messages:manage");

router.post("/", contactLimiter, submitContactMessage);
router.get("/", protect, canManageMessages, getContactMessages);
router.patch("/:id/read", protect, canManageMessages, markMessageRead);
router.delete("/:id", protect, canManageMessages, deleteContactMessage);

export default router;
