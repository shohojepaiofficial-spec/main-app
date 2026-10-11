import { Router } from "express";
import { getCampaigns, createCampaign, getAudiencePreview } from "../controllers/campaignController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";

const router = Router();
const canManageMarketing = authorize("marketing:manage");

router.get("/", protect, canManageMarketing, getCampaigns);
router.post("/", protect, canManageMarketing, auditTrail({ entityType: "campaign", action: "sent", target: { from: "created" } }), createCampaign);
router.get("/audience", protect, canManageMarketing, getAudiencePreview);

export default router;
