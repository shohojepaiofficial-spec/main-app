import { Schema, model, Document, Types } from "mongoose";

// One doc per "create link" action — a staff member's selection of gallery
// images, bundled behind a single signed link (utils/galleryShareLinks.ts).
// No per-image tokens, no ACL table: mirrors SharedCart's shape exactly.
export interface IGalleryShare extends Document {
  product: Types.ObjectId;
  images: Types.ObjectId[];
  createdBy: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const galleryShareSchema = new Schema<IGalleryShare>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    images: [{ type: Schema.Types.ObjectId, ref: "ProductGalleryImage", required: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Reference links, not payment links — they outlive SharedCart's 7 days
    // since staff may share them long before a customer actually opens one.
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const GalleryShare = model<IGalleryShare>("GalleryShare", galleryShareSchema);
