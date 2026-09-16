import { Schema, model, Document, Types } from "mongoose";

export interface CtaLink {
  label: string;
  href: string;
}

export interface IBanner extends Document {
  image: string;
  eyebrow: string;
  accentColor: string;
  title: string;
  subtitle: string;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  // Optional — when set, the public banner response includes that code's
  // live discount details (see bannerController.ts#getBanners) so the
  // slider can show "10% off with code X" instead of a bare CTA button, and
  // the CTA link auto-carries `?promo=CODE` even if the admin forgot to add
  // it by hand.
  promoCode?: Types.ObjectId;
  // Lower sorts first on the landing page slider. Assigned on create (see
  // bannerController.ts#createBanner) and swapped between two banners when
  // an admin moves one up/down — never edited directly by the client.
  order: number;
  // Lets an admin stage a banner without publishing it yet, or pull one down
  // temporarily without losing its content. Public GET /api/banners only
  // ever returns isActive banners.
  isActive: boolean;
  createdAt: Date;
}

const ctaSchema = new Schema<CtaLink>(
  {
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const bannerSchema = new Schema<IBanner>(
  {
    image: { type: String, required: true },
    eyebrow: { type: String, default: "", trim: true },
    accentColor: { type: String, default: "#000000" },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true },
    primaryCta: { type: ctaSchema, required: true },
    secondaryCta: { type: ctaSchema },
    promoCode: { type: Schema.Types.ObjectId, ref: "PromoCode" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Banner = model<IBanner>("Banner", bannerSchema);
