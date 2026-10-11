import { Router } from "express";
import {
  trackEvent,
  getAnalyticsOverview,
  getAnalyticsEventCount,
  resetAnalyticsEvents,
} from "../controllers/analyticsController";
import { protect, optionalAuth, authorize, adminOnly } from "../middleware/auth";
import { analyticsLimiter } from "../middleware/rateLimit";
import { auditTrail } from "../middleware/auditTrail";

const auditAnalyticsReset = auditTrail({
  entityType: "analytics",
  action: "reset",
  target: { from: "none", id: "events", name: "Analytics events" },
  changes: (req, body) => [
    { field: "eventType", after: typeof req.query.type === "string" ? req.query.type : "all" },
    { field: "olderThan", after: typeof req.query.before === "string" ? req.query.before : "any date" },
    { field: "deletedEvents", after: (body as { deletedCount?: number } | undefined)?.deletedCount ?? 0 },
  ],
});

const router = Router();

router.post("/track", analyticsLimiter, optionalAuth, trackEvent);
router.get("/overview", protect, authorize("analytics:manage"), getAnalyticsOverview);
// adminOnly, not authorize("analytics:manage") — deliberately not delegable
// to coadmins. Viewing traffic numbers and permanently deleting them are
// different orders of consequence; see docs/ARCHITECTURE.md.
router.get("/events/count", protect, adminOnly, getAnalyticsEventCount);
router.delete("/events", protect, adminOnly, auditAnalyticsReset, resetAnalyticsEvents);

export default router;
