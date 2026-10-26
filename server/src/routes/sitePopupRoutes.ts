import { Router } from "express";
import { getSitePopup, getSitePopupSettings, updateSitePopup } from "../controllers/sitePopupController";
import { protect, authorize } from "../middleware/auth";
import { upload } from "../utils/upload";
import { adminUploadLimiter } from "../middleware/rateLimit";

const router = Router();
const canManagePopup = authorize("banners:manage");

router.get("/", getSitePopup);
router.get("/settings", protect, canManagePopup, getSitePopupSettings);
router.put("/", protect, canManagePopup, adminUploadLimiter, upload.single("image"), updateSitePopup);

export default router;
