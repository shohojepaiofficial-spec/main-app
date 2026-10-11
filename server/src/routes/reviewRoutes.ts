import { Router } from "express";
import {
  getAllReviews,
  replyToReview,
  deleteReviewReply,
  deleteReviewById,
} from "../controllers/reviewController";
import { protect, authorize } from "../middleware/auth";
import { auditTrail } from "../middleware/auditTrail";

// Admin-side review management across all products. The public,
// per-product review routes (list/submit) stay under /api/products/:id/reviews.
const router = Router();
const canManageReviews = authorize("reviews:manage");

router.get("/", protect, canManageReviews, getAllReviews);
router.put("/:reviewId/reply", protect, canManageReviews, auditTrail({ entityType: "review", action: "updated", target: { from: "param", param: "reviewId" } }), replyToReview);
router.delete("/:reviewId/reply", protect, canManageReviews, auditTrail({ entityType: "review", action: "updated", target: { from: "param", param: "reviewId" } }), deleteReviewReply);
router.delete("/:reviewId", protect, canManageReviews, auditTrail({ entityType: "review", action: "deleted", target: { from: "param", param: "reviewId" } }), deleteReviewById);

export default router;
