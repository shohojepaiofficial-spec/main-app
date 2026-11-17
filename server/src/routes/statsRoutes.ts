import { Router } from "express";
import { getStoreStats } from "../controllers/storeStatsController";
import { getUsage } from "../controllers/railwayController";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

// Public — the homepage's stats section. See storeStatsController.ts.
router.get("/", getStoreStats);

// Full admin only — infra/billing, not a per-permission dashboard item.
router.get("/railway-usage", protect, adminOnly, getUsage);

export default router;
