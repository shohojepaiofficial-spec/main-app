import { Router } from "express";
import {
  trackEvent,
  getAnalyticsOverview,
  getAnalyticsEventCount,
  resetAnalyticsEvents,
} from "../controllers/analyticsController";
import { protect, optionalAuth, authorize, adminOnly } from "../middleware/auth";

const router = Router();

router.post("/track", optionalAuth, trackEvent);
router.get("/overview", protect, authorize("analytics:manage"), getAnalyticsOverview);
// adminOnly, not authorize("analytics:manage") — deliberately not delegable
// to coadmins. Viewing traffic numbers and permanently deleting them are
// different orders of consequence; see docs/ARCHITECTURE.md.
router.get("/events/count", protect, adminOnly, getAnalyticsEventCount);
router.delete("/events", protect, adminOnly, resetAnalyticsEvents);

export default router;
