import { Router } from "express";
import {
  createOrder,
  adminCreateOrder,
  bkashCallback,
  getMyOrders,
  getReviewableProducts,
  getDeliveryQuote,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelMyOrder,
  getOrderStats,
  updateOrderNote,
  updateCourierInfo,
  listPathaoCities,
  listPathaoZones,
  listPathaoAreas,
  bookPathaoOrder,
  refreshPathaoStatus,
  bulkUpdateStatus,
} from "../controllers/orderController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";
import { checkoutIpLimiter, checkoutAccountLimiter, checkoutDailyLimiter, quoteLimiter } from "../middleware/rateLimit";

const router = Router();
const canManageOrders = authorize("orders:manage");

router.post("/", checkoutIpLimiter, protect, checkoutAccountLimiter, checkoutDailyLimiter, createOrder);
router.post("/delivery-quote", checkoutIpLimiter, protect, quoteLimiter, getDeliveryQuote);
router.post("/admin", checkoutIpLimiter, protect, canManageOrders, checkoutAccountLimiter, auditTrail({ entityType: "order", action: "created", target: { from: "created" } }), adminCreateOrder);
router.get("/bkash/callback", bkashCallback);
router.get("/my", protect, getMyOrders);
router.get("/reviewable", protect, getReviewableProducts);
router.get("/stats", protect, canManageOrders, getOrderStats);
router.patch("/bulk/status", protect, canManageOrders, auditTrail({ entityType: "order", action: "updated", target: { from: "bulk" } }), bulkUpdateStatus);
router.get("/pathao/cities", protect, canManageOrders, listPathaoCities);
router.get("/pathao/cities/:cityId/zones", protect, canManageOrders, listPathaoZones);
router.get("/pathao/zones/:zoneId/areas", protect, canManageOrders, listPathaoAreas);
router.get("/", protect, canManageOrders, getAllOrders);
router.patch("/:id/status", protect, canManageOrders, auditTrail({ entityType: "order", action: "updated", target: { from: "param" } }), updateOrderStatus);
router.patch("/:id/cancel", protect, cancelMyOrder);
router.patch("/:id/note", protect, canManageOrders, auditTrail({ entityType: "order", action: "updated", target: { from: "param" } }), updateOrderNote);
router.patch("/:id/courier", protect, canManageOrders, auditTrail({ entityType: "order", action: "updated", target: { from: "param" } }), updateCourierInfo);
router.post("/:id/pathao", protect, canManageOrders, auditTrail({ entityType: "order", action: "booked", target: { from: "param" } }), bookPathaoOrder);
router.post("/:id/pathao/refresh", protect, canManageOrders, refreshPathaoStatus);
router.get("/:id", protect, getOrderById);

export default router;
