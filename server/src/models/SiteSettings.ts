import { Schema, model, Document } from "mongoose";

// The one site-wide settings document (social links + email routing),
// found by `key: "site"` — same singleton convention as SitePopup.
export interface ISiteSettings extends Document {
  key: "site";
  social: {
    facebookUrl?: string;
    instagramUrl?: string;
    // "8801XXXXXXXXX" — same digits-only-with-country-code convention as
    // the hardcoded WHATSAPP_NUMBER it replaces (see utils/phone.ts).
    whatsappNumber?: string;
  };
  emailRouting: {
    // Where a contact-form submission is sent.
    contact?: string;
    // "From" address for account/order emails (verification, password
    // reset, order status, 2FA, review replies, role changes, sign-in
    // alerts, return updates).
    transactional?: string;
    // Display name paired with `transactional`, e.g. "Shohoje Pai" — combined
    // into `"Name <address>"` for the Resend "from" header. Kept as a
    // separate field because <input type="email"> (and most mail UIs) reject
    // that combined format if typed directly.
    transactionalName?: string;
    // "From" address for campaign (marketing) emails.
    marketing?: string;
    // Display name paired with `marketing`, same reasoning as transactionalName.
    marketingName?: string;
  };
}

const socialSchema = new Schema(
  {
    facebookUrl: { type: String, trim: true, maxlength: 300 },
    instagramUrl: { type: String, trim: true, maxlength: 300 },
    whatsappNumber: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false }
);

const emailRoutingSchema = new Schema(
  {
    contact: { type: String, trim: true, lowercase: true, maxlength: 200 },
    transactional: { type: String, trim: true, lowercase: true, maxlength: 200 },
    transactionalName: { type: String, trim: true, maxlength: 100 },
    marketing: { type: String, trim: true, lowercase: true, maxlength: 200 },
    marketingName: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false }
);

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, enum: ["site"], default: "site", unique: true },
    social: { type: socialSchema, default: () => ({}) },
    emailRouting: { type: emailRoutingSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const SiteSettings = model<ISiteSettings>("SiteSettings", siteSettingsSchema);
