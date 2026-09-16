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

const router = Router();
const canManagePromotions = authorize("promotions:manage");

router.post("/validate", validatePromoCode);
router.get("/active", getActivePromoCodes);
router.get("/", protect, canManagePromotions, getPromoCodes);
router.post("/", protect, canManagePromotions, createPromoCode);
router.put("/:id", protect, canManagePromotions, updatePromoCode);
router.delete("/:id", protect, canManagePromotions, deletePromoCode);

export default router;
