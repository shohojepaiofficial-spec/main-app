import { Router } from "express";
import { getPublicTranslations, getAllTranslations, updateTranslation } from "../controllers/translationController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";

const router = Router();
const canManageTranslations = authorize("translations:manage");

router.get("/", getPublicTranslations);
router.get("/all", protect, canManageTranslations, getAllTranslations);
router.put("/:key", protect, canManageTranslations, auditTrail({ entityType: "translation", action: "updated", target: { from: "param", param: "key" } }), updateTranslation);

export default router;
