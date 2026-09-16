import { Router } from "express";
import { getCampaigns, createCampaign, getAudiencePreview } from "../controllers/campaignController";
import { protect, authorize } from "../middleware/auth";

const router = Router();
const canManageMarketing = authorize("marketing:manage");

router.get("/", protect, canManageMarketing, getCampaigns);
router.post("/", protect, canManageMarketing, createCampaign);
router.get("/audience", protect, canManageMarketing, getAudiencePreview);

export default router;
