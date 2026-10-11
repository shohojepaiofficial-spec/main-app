import { Router } from "express";
import { getReconciliation, recheckPayment, resolvePaymentReview } from "../controllers/paymentController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";

// Payment reconciliation dashboard (WORK-11), staff with orders:manage.
const router = Router();
const canManageOrders = authorize("orders:manage");

router.get("/reconciliation", protect, canManageOrders, getReconciliation);
router.post("/:id/recheck", protect, canManageOrders, auditTrail({ entityType: "order", action: "updated", target: { from: "param" } }), recheckPayment);
router.post("/:id/resolve", protect, canManageOrders, auditTrail({ entityType: "order", action: "updated", target: { from: "param" } }), resolvePaymentReview);

export default router;
