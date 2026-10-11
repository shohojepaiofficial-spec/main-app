import { Router } from "express";
import { getAuditActors, getAuditLogs } from "../controllers/auditLogController";
import { adminOnly, protect } from "../middleware/auth";

const router = Router();

// Change history can contain sensitive operational details, so only the
// store owner account can read it. Events are append-only through the API.
router.get("/", protect, adminOnly, getAuditLogs);
router.get("/actors", protect, adminOnly, getAuditActors);

export default router;
