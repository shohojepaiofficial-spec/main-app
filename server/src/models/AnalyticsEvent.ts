import { Schema, model, Document, Types } from "mongoose";

export type AnalyticsEventType = "page_view" | "product_click";

export interface IAnalyticsEvent extends Document {
  type: AnalyticsEventType;
  // The route path for a page_view. Also kept on a product_click (the page
  // the click happened on) for context, though product is what's aggregated.
  path: string;
  product?: Types.ObjectId;
  user?: Types.ObjectId;
  // A random id the client generates once and keeps in localStorage — lets
  // "unique visitors" be counted for anonymous traffic, not just logged-in
  // users. Not a substitute for real auth identity, just a rough visitor count.
  sessionId: string;
  // The raw `document.referrer` at the moment this event fired, if any — a
  // full-page load's referrer stays constant for the whole browser tab (it
  // doesn't update on client-side route changes), so a session's first
  // page_view is the one that actually reflects where the visitor came
  // from. See utils/referrer.ts for turning this into a platform label.
  referrer?: string;
  createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, enum: ["page_view", "product_click"], required: true },
    path: { type: String, required: true, trim: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", index: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, required: true },
    referrer: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

analyticsEventSchema.index({ type: 1, createdAt: -1 });

// Retention — every page view and click was previously kept forever (see
// docs/PROGRESS.md's known follow-ups). A TTL index lets MongoDB itself
// expire and delete documents once they're older than this, on a background
// sweep — no cron job or manual cleanup script needed. 180 days is enough
// for real trend analysis (the admin dashboard's longest preset is "30d";
// "all" just means "everything still within this window") while keeping the
// collection from growing without bound.
const ANALYTICS_RETENTION_SECONDS = 180 * 24 * 60 * 60;
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: ANALYTICS_RETENTION_SECONDS });

export const AnalyticsEvent = model<IAnalyticsEvent>("AnalyticsEvent", analyticsEventSchema);
