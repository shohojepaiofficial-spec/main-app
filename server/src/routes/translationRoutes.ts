import { Router } from "express";
import { getPublicTranslations, getAllTranslations, updateTranslation } from "../controllers/translationController";
import { protect, authorize } from "../middleware/auth";

const router = Router();
const canManageTranslations = authorize("translations:manage");

router.get("/", getPublicTranslations);
router.get("/all", protect, canManageTranslations, getAllTranslations);
router.put("/:key", protect, canManageTranslations, updateTranslation);

export default router;
