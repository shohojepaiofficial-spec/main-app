import { Router } from "express";
import { getUsers, updateUserAccess } from "../controllers/userController";
import { protect, adminOnly } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";

const router = Router();

router.get("/", protect, adminOnly, getUsers);
router.patch("/:id/access", protect, adminOnly, auditTrail({ entityType: "user", action: "updated", target: { from: "param" } }), updateUserAccess);

export default router;
