import { Router } from "express";
import { getAds, createAd, publishAd, deleteAd } from "../controllers/adController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";
import { upload } from "../utils/upload";
import { adminUploadLimiter } from "../middleware/rateLimit";

const router = Router();
const canManageAds = authorize("ads:manage");

router.get("/", protect, canManageAds, getAds);
router.post("/", protect, canManageAds, adminUploadLimiter, upload.single("image"), auditTrail({ entityType: "ad", action: "created", target: { from: "created" } }), createAd);
router.post("/:id/publish", protect, canManageAds, auditTrail({ entityType: "ad", action: "published", target: { from: "param" } }), publishAd);
router.delete("/:id", protect, canManageAds, auditTrail({ entityType: "ad", action: "deleted", target: { from: "param" } }), deleteAd);

export default router;
