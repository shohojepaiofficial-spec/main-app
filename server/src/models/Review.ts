import { Schema, model, Document, Types } from "mongoose";

export interface IReview extends Document {
  product: Types.ObjectId;
  user: Types.ObjectId;
  userName: string;
  rating: number;
  comment: string;
  // Computed once at submit time (see reviewController.ts#submitReview) —
  // whether this user has a delivered order containing this product.
  // Snapshot, not live: a later order/refund never retroactively changes it.
  isVerifiedPurchase: boolean;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Snapshot at write time so a review still shows a name if the user is
    // later deleted/renamed — reviews aren't updated retroactively.
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per user per product — resubmitting updates it instead of
// piling up duplicates (see reviewController.ts#submitReview's upsert).
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export const Review = model<IReview>("Review", reviewSchema);
