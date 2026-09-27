import { Router } from "express";
import {
  getAllReviews,
  replyToReview,
  deleteReviewReply,
  deleteReviewById,
} from "../controllers/reviewController";
import { protect, authorize } from "../middleware/auth";

// Admin-side review management across all products. The public,
// per-product review routes (list/submit) stay under /api/products/:id/reviews.
const router = Router();
const canManageReviews = authorize("reviews:manage");

router.get("/", protect, canManageReviews, getAllReviews);
router.put("/:reviewId/reply", protect, canManageReviews, replyToReview);
router.delete("/:reviewId/reply", protect, canManageReviews, deleteReviewReply);
router.delete("/:reviewId", protect, canManageReviews, deleteReviewById);

export default router;
