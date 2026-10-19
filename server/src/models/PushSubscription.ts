import { Schema, model, Document, Types } from "mongoose";

// One browser/device that allowed push notifications for a signed-in user.
// `endpoint` is unique: the same browser re-subscribing (or signing in as
// someone else) moves the row instead of duplicating it.
export interface IPushSubscription extends Document {
  user: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 2000 },
    keys: {
      p256dh: { type: String, required: true, maxlength: 500 },
      auth: { type: String, required: true, maxlength: 500 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PushSubscription = model<IPushSubscription>("PushSubscription", pushSubscriptionSchema);
