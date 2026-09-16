import { Router } from "express";
import {
  createOrder,
  adminCreateOrder,
  getMyOrders,
  getReviewableProducts,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelMyOrder,
  getOrderStats,
} from "../controllers/orderController";
import { protect, authorize } from "../middleware/auth";

const router = Router();
const canManageOrders = authorize("orders:manage");

router.post("/", protect, createOrder);
router.post("/admin", protect, canManageOrders, adminCreateOrder);
router.get("/my", protect, getMyOrders);
router.get("/reviewable", protect, getReviewableProducts);
router.get("/stats", protect, canManageOrders, getOrderStats);
router.get("/", protect, canManageOrders, getAllOrders);
router.patch("/:id/status", protect, canManageOrders, updateOrderStatus);
router.patch("/:id/cancel", protect, cancelMyOrder);
router.get("/:id", protect, getOrderById);

export default router;
