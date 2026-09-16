import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  // Manually set by the admin, not computed from a courier's rates — there's
  // no shipping-provider integration, so these are just flat fees the admin
  // picks: one for delivery inside the city, one for outside it. See
  // docs/PROGRESS.md.
  deliveryFeeInsideCity: number;
  deliveryFeeOutsideCity: number;
  // Admin-picked, for the homepage's "Featured" section — not computed from
  // sales/clicks. See docs/PROGRESS.md.
  isFeatured: boolean;
  createdAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
    deliveryFeeInsideCity: { type: Number, required: true, min: 0, default: 0 },
    deliveryFeeOutsideCity: { type: Number, required: true, min: 0, default: 0 },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Product = model<IProduct>("Product", productSchema);
