import { isValidObjectId } from "mongoose";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { PromoCode } from "../models/PromoCode";
import { Ad } from "../models/Ad";
import { Campaign } from "../models/Campaign";
import { ContactMessage } from "../models/ContactMessage";
import { Review } from "../models/Review";
import { Translation } from "../models/Translation";
import { ReturnRequest } from "../models/ReturnRequest";
import type { AuditEntityType } from "../models/AuditLog";

// Plain snapshots of the fields that buildAuditChanges tracks, plus a
// human-readable name for the history list. Loaders project only what the
// history needs, so secrets, contact details and payment IDs never leave the
// database through this path.
export interface AuditSnapshot {
  name: string;
  data: object;
}

type Loader = (id: string) => Promise<AuditSnapshot | null>;

const orderNumber = (id: string) => `Order #${id.slice(-6).toUpperCase()}`;

const loaders: Partial<Record<AuditEntityType, Loader>> = {
  order: async (id) => {
    const order = await Order.findById(id)
      .select("status totalAmount paymentMethod internalNote courierConsignmentId courierTrackingStatus courierNote courierBookedAt paymentReviewRequired paymentReviewNote")
      .lean();
    return order ? { name: orderNumber(id), data: order } : null;
  },
  return: async (id) => {
    const request = await ReturnRequest.findById(id).select("type status customerMessage staffNote restocked refund.amount refund.method refund.reference replacementOrder").lean();
    return request ? { name: `${request.type === "exchange" ? "Exchange" : "Return"} #${id.slice(-6).toUpperCase()}`, data: request } : null;
  },
  user: async (id) => {
    const user = await User.findById(id).select("name role permissions").lean();
    return user ? { name: user.name, data: user } : null;
  },
  account: async (id) => {
    const user = await User.findById(id).select("name phone image").lean();
    return user ? { name: user.name, data: user } : null;
  },
  promo: async (id) => {
    const promo = await PromoCode.findById(id).select("code discountType value scope product isActive expiresAt").lean();
    return promo ? { name: promo.code, data: promo } : null;
  },
  ad: async (id) => {
    const ad = await Ad.findById(id).select("title sourceType caption link platforms results image").lean();
    if (!ad) return null;
    // Platform results keep their status and time but not provider post IDs
    // or raw error payloads.
    const results = ad.results.map(({ platform, status, postedAt }) => ({ platform, status, postedAt }));
    return { name: ad.title, data: { ...ad, results } };
  },
  campaign: async (id) => {
    const campaign = await Campaign.findById(id).select("title sourceType channels emailSubject smsMessage stats").lean();
    return campaign ? { name: campaign.title, data: campaign } : null;
  },
  message: async (id) => {
    const message = await ContactMessage.findById(id).select("subject isRead").lean();
    return message ? { name: message.subject, data: message } : null;
  },
  review: async (id) => {
    const review = await Review.findById(id).select("userName rating comment reply").lean();
    if (!review) return null;
    return {
      name: `Review by ${review.userName}`,
      data: { rating: review.rating, comment: review.comment, reply: review.reply?.text ?? null },
    };
  },
  translation: async (key) => {
    const translation = await Translation.findOne({ key }).select("key en bn").lean();
    return translation ? { name: translation.key, data: translation } : null;
  },
};

export async function loadAuditSnapshot(entityType: AuditEntityType, id: string): Promise<AuditSnapshot | null> {
  const loader = loaders[entityType];
  if (!loader) return null;
  if (entityType !== "translation" && !isValidObjectId(id)) return null;
  return loader(id);
}
