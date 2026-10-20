import { Router } from "express";
import {
  getPromoCodes,
  getActivePromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  validatePromoCode,
} from "../controllers/promoCodeController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";
import { promoValidateLimiter } from "../middleware/rateLimit";

const router = Router();
const canManagePromotions = authorize("promotions:manage");

router.post("/validate", promoValidateLimiter, validatePromoCode);
router.get("/active", getActivePromoCodes);
router.get("/", protect, canManagePromotions, getPromoCodes);
router.post("/", protect, canManagePromotions, auditTrail({ entityType: "promo", action: "created", target: { from: "created" } }), createPromoCode);
router.put("/:id", protect, canManagePromotions, auditTrail({ entityType: "promo", action: "updated", target: { from: "param" } }), updatePromoCode);
router.delete("/:id", protect, canManagePromotions, auditTrail({ entityType: "promo", action: "deleted", target: { from: "param" } }), deletePromoCode);

export default router;
