import { Router } from "express";
import {
  submitContactMessage,
  getContactMessages,
  markMessageRead,
  deleteContactMessage,
} from "../controllers/contactController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";
import { contactLimiter } from "../middleware/rateLimit";

const router = Router();
const canManageMessages = authorize("messages:manage");

router.post("/", contactLimiter, submitContactMessage);
router.get("/", protect, canManageMessages, getContactMessages);
router.patch("/:id/read", protect, canManageMessages, auditTrail({ entityType: "message", action: "updated", target: { from: "param" } }), markMessageRead);
router.delete("/:id", protect, canManageMessages, auditTrail({ entityType: "message", action: "deleted", target: { from: "param" } }), deleteContactMessage);

export default router;
