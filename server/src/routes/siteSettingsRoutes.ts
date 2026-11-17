import { Router } from "express";
import { getPublicSiteSettings, getSiteSettings, updateSiteSettings } from "../controllers/siteSettingsController";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

router.get("/", getPublicSiteSettings);
router.get("/admin", protect, adminOnly, getSiteSettings);
router.put("/", protect, adminOnly, updateSiteSettings);

export default router;
