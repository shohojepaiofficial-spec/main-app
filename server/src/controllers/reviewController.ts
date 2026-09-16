import { Response } from "express";
import mongoose from "mongoose";
import { Review } from "../models/Review";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { AuthRequest } from "../middleware/auth";

const PAGE_SIZE = 5;

export const getProductReviews = async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const productId = req.params.id as string;

  const [items, total, summary] = await Promise.all([
    Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Review.countDocuments({ product: productId }),
    // Aggregate's $match doesn't auto-cast strings to ObjectId like find() does.
    Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, average: { $avg: "$rating" } } },
    ]),
  ]);

  res.json({
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    average: summary[0]?.average ?? null,
  });
};

export const submitReview = async (req: AuthRequest, res: Response) => {
  const { rating, comment } = req.body as { rating?: number; comment?: string };

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }
  if (!comment || !comment.trim()) {
    return res.status(400).json({ message: "Comment is required" });
  }

  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: "Not authorized" });

  // A snapshot at submit time, not a live join — see Review.ts's comment.
  const isVerifiedPurchase = await Order.exists({
    user: req.userId,
    status: "delivered",
    "items.product": req.params.id,
  }).then(Boolean);

  const review = await Review.findOneAndUpdate(
    { product: req.params.id, user: req.userId },
    { rating, comment: comment.trim(), userName: user.name, isVerifiedPurchase },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(review);
};

// Moderation (reviews:manage) — previously there was no way to remove a
// review at all, regardless of content. Any admin/coadmin holding this
// permission can delete any user's review; there's no edit, only removal —
// matches the "delete confirmations, not edits" pattern used for banners/
// products/promo codes elsewhere in the admin panel.
export const deleteReview = async (req: AuthRequest, res: Response) => {
  const review = await Review.findOneAndDelete({
    _id: req.params.reviewId,
    product: req.params.id,
  });
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.status(204).send();
};
