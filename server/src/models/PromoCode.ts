import { Schema, model, Document, Types } from "mongoose";

export type DiscountType = "percentage" | "flat";
export type PromoScope = "all" | "product";

export interface IPromoCode extends Document {
  code: string;
  discountType: DiscountType;
  // A percentage (0-100) or a flat currency amount, depending on discountType.
  value: number;
  scope: PromoScope;
  // Required (and only meaningful) when scope === "product".
  product?: Types.ObjectId;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

const promoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percentage", "flat"], required: true },
    value: { type: Number, required: true, min: 0 },
    scope: { type: String, enum: ["all", "product"], required: true, default: "all" },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

promoCodeSchema.pre("validate", function () {
  if (this.discountType === "percentage" && this.value > 100) {
    this.invalidate("value", "A percentage discount can't exceed 100");
  }
  if (this.scope === "product" && !this.product) {
    this.invalidate("product", "product is required when scope is 'product'");
  }
});

export const PromoCode = model<IPromoCode>("PromoCode", promoCodeSchema);
