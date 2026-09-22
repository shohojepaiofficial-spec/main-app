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

const router = Router();
const canManageOrders = authorize("orders:manage");

router.post("/", protect, createOrder);
router.post("/delivery-quote", protect, getDeliveryQuote);
router.post("/admin", protect, canManageOrders, adminCreateOrder);
router.get("/bkash/callback", bkashCallback);
router.get("/my", protect, getMyOrders);
router.get("/reviewable", protect, getReviewableProducts);
router.get("/stats", protect, canManageOrders, getOrderStats);
router.patch("/bulk/status", protect, canManageOrders, bulkUpdateStatus);
router.get("/pathao/cities", protect, canManageOrders, listPathaoCities);
router.get("/pathao/cities/:cityId/zones", protect, canManageOrders, listPathaoZones);
router.get("/pathao/zones/:zoneId/areas", protect, canManageOrders, listPathaoAreas);
router.get("/", protect, canManageOrders, getAllOrders);
router.patch("/:id/status", protect, canManageOrders, updateOrderStatus);
router.patch("/:id/cancel", protect, cancelMyOrder);
router.patch("/:id/note", protect, canManageOrders, updateOrderNote);
router.patch("/:id/courier", protect, canManageOrders, updateCourierInfo);
router.post("/:id/pathao", protect, canManageOrders, bookPathaoOrder);
router.post("/:id/pathao/refresh", protect, canManageOrders, refreshPathaoStatus);
router.get("/:id", protect, getOrderById);

export default router;
