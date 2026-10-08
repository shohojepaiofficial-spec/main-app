import { validateControllerInput } from "../middleware/controllerInput";
import { Response } from "express";
import mongoose from "mongoose";
import { Review } from "../models/Review";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { AuthRequest } from "../middleware/auth";
import { isNonEmptyString } from "../utils/validate";

const PAGE_SIZE = 5;

export const getProductReviews = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getProductReviews", req);
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const productId = req.params.id as string;

  const [items, total, summary] = await Promise.all([
    Review.find({ product: productId })
      // The public sees the reply as the store's, not which staff member
      // wrote it — see Review.ts.
      .select("-reply.repliedBy -reply.repliedByName")
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
  validateControllerInput("submitReview", req);
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

const ADMIN_PAGE_SIZE = 20;

// Every review across every product, for the admin Reviews page
// (reviews:manage). `status=unreplied` is the default working view — the
// reviews still waiting on a store response — and the response always
// carries that count so the page can show it whichever filter is active.
export const getAllReviews = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getAllReviews", req);
  const { status, rating } = req.query;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);

  const filter: Record<string, unknown> = {};
  if (status === "unreplied") filter.reply = { $exists: false };
  else if (status === "replied") filter.reply = { $exists: true };
  const ratingNumber = Number(rating);
  if (Number.isInteger(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5) filter.rating = ratingNumber;

  const [items, total, unrepliedCount] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .populate("product", "name images"),
    Review.countDocuments(filter),
    Review.countDocuments({ reply: { $exists: false } }),
  ]);

  res.json({
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    unrepliedCount,
  });
};

// Writes (or rewrites) the store's public response to a review — one reply
// per review, no thread. Editing replaces it and moves repliedAt forward.
export const replyToReview = async (req: AuthRequest, res: Response) => {
  validateControllerInput("replyToReview", req);
  const { text } = req.body as { text?: unknown };
  if (!isNonEmptyString(text)) {
    return res.status(400).json({ message: "Reply can't be empty" });
  }
  if (text.trim().length > 2000) {
    return res.status(400).json({ message: "Reply is too long (max 2000 characters)" });
  }

  const admin = await User.findById(req.userId).select("name");
  if (!admin) return res.status(401).json({ message: "Not authorized" });

  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { reply: { text: text.trim(), repliedBy: admin._id, repliedByName: admin.name, repliedAt: new Date() } },
    { new: true, runValidators: true }
  ).populate("product", "name images");
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.json(review);
};

export const deleteReviewReply = async (req: AuthRequest, res: Response) => {
  validateControllerInput("deleteReviewReply", req);
  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { $unset: { reply: 1 } },
    { new: true }
  ).populate("product", "name images");
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.json(review);
};

// The admin Reviews page's delete — same as deleteReview below, just
// addressed by review id alone (that page lists reviews across products).
export const deleteReviewById = async (req: AuthRequest, res: Response) => {
  validateControllerInput("deleteReviewById", req);
  const review = await Review.findByIdAndDelete(req.params.reviewId);
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.status(204).send();
};

// Moderation (reviews:manage) — previously there was no way to remove a
// review at all, regardless of content. Any admin/coadmin holding this
// permission can delete any user's review; there's no edit, only removal —
// matches the "delete confirmations, not edits" pattern used for banners/
// products/promo codes elsewhere in the admin panel.
export const deleteReview = async (req: AuthRequest, res: Response) => {
  validateControllerInput("deleteReview", req);
  const review = await Review.findOneAndDelete({
    _id: req.params.reviewId,
    product: req.params.id,
  });
  if (!review) return res.status(404).json({ message: "Review not found" });
  res.status(204).send();
};
