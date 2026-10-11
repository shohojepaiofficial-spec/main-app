import { Router } from "express";
import {
  createReturnRequest,
  adminCreateReturnRequest,
  getMyReturns,
  getAllReturns,
  updateReturnStatus,
  recordRefund,
  refundWithBkash,
} from "../controllers/returnController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";

// Returns, exchanges and refunds (WORK-08). Customers request and track their
// own; staff with orders:manage handle every request.
const router = Router();
const canManageOrders = authorize("orders:manage");
const audited = (action: "created" | "updated") => auditTrail({ entityType: "return", action, target: { from: action === "created" ? "created" : "param" } });

router.post("/", protect, createReturnRequest);
router.get("/my", protect, getMyReturns);
router.get("/", protect, canManageOrders, getAllReturns);
router.post("/admin", protect, canManageOrders, audited("created"), adminCreateReturnRequest);
router.patch("/:id/status", protect, canManageOrders, audited("updated"), updateReturnStatus);
router.post("/:id/refund", protect, canManageOrders, audited("updated"), recordRefund);
router.post("/:id/refund/bkash", protect, canManageOrders, audited("updated"), refundWithBkash);

export default router;
