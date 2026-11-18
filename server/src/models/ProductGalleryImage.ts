import { Schema, model, Document, Types } from "mongoose";

// An extra product photo kept outside the 5 featured `Product.images` — the
// bulk of what staff actually shoot, so a customer who wants a different
// angle can be shown one without digging through local folders/phones. Its
// own collection, not an array field on Product, so adding one photo never
// rewrites a growing array (unlike Product.images, capped at 5 for exactly
// that reason).
export interface IProductGalleryImage extends Document {
  product: Types.ObjectId;
  url: string;
  tags: string[];
  uploadedBy: Types.ObjectId;
  createdAt: Date;
}

const productGalleryImageSchema = new Schema<IProductGalleryImage>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    url: { type: String, required: true },
    tags: { type: [String], default: [] },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ProductGalleryImage = model<IProductGalleryImage>("ProductGalleryImage", productGalleryImageSchema);
