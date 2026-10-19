import { Schema, model, Document, Types } from "mongoose";

// One in-site (bell) notification for one person. Staff alerts are fanned
// out into one document per staff member when they happen (utils/notify.ts),
// so "read" is simply per document. Deleted automatically after 90 days.
export const NOTIFICATION_TYPES = [
  "order_status",
  "return_update",
  "review_reply",
  "staff_new_order",
  "staff_payment_review",
  "staff_return_request",
  "staff_low_stock",
  "staff_contact_message",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TTL_SECONDS = 90 * 24 * 60 * 60;

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  // Site-relative path to open on click, e.g. "/orders/<id>".
  link?: string;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    link: { type: String, trim: true, maxlength: 500 },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_SECONDS });

export const Notification = model<INotification>("Notification", notificationSchema);
