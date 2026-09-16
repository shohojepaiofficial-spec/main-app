import { Schema, model, Document, Types } from "mongoose";

// What the campaign's content was generated from — purely a badge, doesn't
// change how sending works. Mirrors Ad.sourceType (see models/Ad.ts).
export type CampaignSourceType = "product" | "promotion" | "custom";

export type CampaignChannel = "email" | "sms";

export interface ICampaign extends Document {
  title: string;
  sourceType: CampaignSourceType;
  product?: Types.ObjectId;
  promoCode?: Types.ObjectId;
  channels: CampaignChannel[];
  emailSubject?: string;
  emailBody?: string;
  smsMessage?: string;
  // Snapshotted at send time — how many opted-in recipients existed, how
  // many sends actually succeeded/failed. Kept alongside the detailed
  // `recipients` log below rather than derived from it, so the headline
  // numbers are a cheap read even once a campaign has hundreds of entries.
  stats: {
    recipientCount: number;
    sentCount: number;
    failedCount: number;
  };
  // One entry per (recipient x channel actually attempted) — who got this
  // campaign, on which channel, and whether it actually went through. Kept
  // as an embedded array rather than a separate collection: a campaign's
  // recipient list is only ever read alongside the campaign itself (the
  // admin expanding one row), never queried independently across
  // campaigns, and this store's scale (hundreds of customers, not
  // hundreds of thousands) keeps a single document well within Mongo's
  // 16MB limit.
  recipients: {
    user: Types.ObjectId;
    name: string;
    channel: CampaignChannel;
    status: "sent" | "failed";
    error?: string;
  }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    title: { type: String, required: true, trim: true },
    sourceType: { type: String, enum: ["product", "promotion", "custom"], required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    promoCode: { type: Schema.Types.ObjectId, ref: "PromoCode" },
    channels: { type: [String], enum: ["email", "sms"], default: [] },
    emailSubject: { type: String, trim: true },
    emailBody: { type: String },
    smsMessage: { type: String, trim: true },
    stats: {
      recipientCount: { type: Number, default: 0 },
      sentCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      _id: false,
    },
    recipients: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        channel: { type: String, enum: ["email", "sms"], required: true },
        status: { type: String, enum: ["sent", "failed"], required: true },
        error: { type: String },
        _id: false,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Campaign = model<ICampaign>("Campaign", campaignSchema);
