import { Schema, model, Document, Types } from "mongoose";

// What the ad's content was generated from — purely informational (shows up
// as a badge in the admin list), doesn't gate anything.
export type AdSourceType = "product" | "promotion" | "custom";

export type AdPlatform = "facebook" | "instagram" | "x";

// "not_connected" = this platform's API keys aren't set in the server's
// env yet (see integrations/meta.ts, integrations/x.ts) — distinct from
// "failed" (keys are there, the API call itself rejected it) so the admin
// list can tell "you haven't set this up" apart from "something's wrong".
export type AdPlatformStatus = "pending" | "posted" | "failed" | "not_connected";

export interface IAdPlatformResult {
  platform: AdPlatform;
  status: AdPlatformStatus;
  postedAt?: Date;
  externalPostId?: string;
  errorMessage?: string;
}

export interface IAd extends Document {
  title: string;
  sourceType: AdSourceType;
  product?: Types.ObjectId;
  promoCode?: Types.ObjectId;
  caption: string;
  // A relative /uploads path, same convention as Product/Banner images.
  image?: string;
  link?: string;
  platforms: AdPlatform[];
  results: IAdPlatformResult[];
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const resultSchema = new Schema<IAdPlatformResult>(
  {
    platform: { type: String, enum: ["facebook", "instagram", "x"], required: true },
    status: {
      type: String,
      enum: ["pending", "posted", "failed", "not_connected"],
      default: "pending",
    },
    postedAt: { type: Date },
    externalPostId: { type: String },
    errorMessage: { type: String },
  },
  { _id: false }
);

const adSchema = new Schema<IAd>(
  {
    title: { type: String, required: true, trim: true },
    sourceType: { type: String, enum: ["product", "promotion", "custom"], required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    promoCode: { type: Schema.Types.ObjectId, ref: "PromoCode" },
    caption: { type: String, required: true, trim: true },
    image: { type: String },
    link: { type: String, trim: true },
    platforms: { type: [String], enum: ["facebook", "instagram", "x"], default: [] },
    results: { type: [resultSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Ad = model<IAd>("Ad", adSchema);
