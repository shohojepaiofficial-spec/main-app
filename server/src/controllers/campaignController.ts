import { Response } from "express";
import { Campaign, CampaignChannel, CampaignSourceType } from "../models/Campaign";
import { User } from "../models/User";
import { PromoCode } from "../models/PromoCode";
import { sendEmail } from "../utils/sendEmail";
import { generateUnsubscribeToken } from "../utils/campaignTokens";
import { isSmsConfigured, sendSms } from "../integrations/sms";
import { AuthRequest } from "../middleware/auth";

const ALL_CHANNELS: CampaignChannel[] = ["email", "sms"];
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const shapeCampaign = (campaign: InstanceType<typeof Campaign>) => ({
  _id: campaign.id,
  title: campaign.title,
  sourceType: campaign.sourceType,
  product: campaign.product,
  promoCode: campaign.promoCode,
  channels: campaign.channels,
  emailSubject: campaign.emailSubject,
  emailBody: campaign.emailBody,
  smsMessage: campaign.smsMessage,
  stats: campaign.stats,
  recipients: campaign.recipients,
  createdAt: campaign.createdAt,
});

export const getCampaigns = async (_req: AuthRequest, res: Response) => {
  const campaigns = await Campaign.find()
    .sort({ createdAt: -1 })
    .populate("product", "name")
    .populate("promoCode", "code");
  res.json(campaigns.map(shapeCampaign));
};

// Composes nothing itself — the admin form generates the subject/body/sms
// text client-side (from a product, promo, or freehand) the same way
// AdminAdFormModal does for social ads; this just validates, finds who's
// actually opted in, and sends immediately. No scheduling, same as ads.
export const createCampaign = async (req: AuthRequest, res: Response) => {
  const {
    title,
    sourceType,
    productId,
    promoCode: promoCodeInput,
    channels,
    emailSubject,
    emailBody,
    smsMessage,
  } = req.body as {
    title?: string;
    sourceType?: string;
    productId?: string;
    promoCode?: string;
    channels?: CampaignChannel[];
    emailSubject?: string;
    emailBody?: string;
    smsMessage?: string;
  };

  if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
  if (sourceType !== "product" && sourceType !== "promotion" && sourceType !== "custom") {
    return res.status(400).json({ message: "Invalid source type" });
  }
  if (!Array.isArray(channels) || channels.length === 0 || !channels.every((c) => ALL_CHANNELS.includes(c))) {
    return res.status(400).json({ message: "Pick at least one channel" });
  }
  if (channels.includes("email") && (!emailSubject?.trim() || !emailBody?.trim())) {
    return res.status(400).json({ message: "Email subject and body are required" });
  }
  if (channels.includes("sms") && !smsMessage?.trim()) {
    return res.status(400).json({ message: "SMS message is required" });
  }

  let promoDoc = null;
  if (sourceType === "promotion") {
    if (!promoCodeInput?.trim()) return res.status(400).json({ message: "Pick a promo code" });
    promoDoc = await PromoCode.findOne({ code: promoCodeInput.trim().toUpperCase() });
    if (!promoDoc) return res.status(400).json({ message: "That promo code no longer exists" });
  }

  const wantsEmail = channels.includes("email");
  const wantsSms = channels.includes("sms");

  const recipients = await User.find({
    $or: [
      ...(wantsEmail ? [{ "marketingOptIn.email": true }] : []),
      ...(wantsSms ? [{ "marketingOptIn.sms": true, phone: { $exists: true, $ne: "" } }] : []),
    ],
  }).select("name email phone marketingOptIn");

  // One entry per (recipient x channel actually attempted) — see
  // models/Campaign.ts's `recipients` field. Each recipient's own
  // send/error handling is independent so one failure never stops the rest.
  const recipientLog: {
    user: string;
    name: string;
    channel: CampaignChannel;
    status: "sent" | "failed";
    error?: string;
  }[] = [];

  await Promise.all(
    recipients.map(async (recipient) => {
      if (wantsEmail && recipient.marketingOptIn.email) {
        // Every recipient gets their own footer — the unsubscribe link is
        // keyed to their user id, so it can only ever opt *that* account
        // out, and works with no login (see authController.ts#unsubscribeFromMarketing).
        const unsubscribeUrl = `${CLIENT_URL}/unsubscribe?uid=${recipient.id}&token=${generateUnsubscribeToken(recipient.id as string)}`;
        const bodyWithFooter = `${emailBody!.trim()}<hr style="margin-top:24px;border:none;border-top:1px solid #e5e5e5" /><p style="font-size:11px;color:#888">Don't want these emails? <a href="${unsubscribeUrl}">Unsubscribe</a></p>`;
        try {
          await sendEmail({ to: recipient.email, subject: emailSubject!.trim(), html: bodyWithFooter });
          recipientLog.push({ user: recipient.id, name: recipient.name, channel: "email", status: "sent" });
        } catch (err) {
          recipientLog.push({
            user: recipient.id,
            name: recipient.name,
            channel: "email",
            status: "failed",
            error: (err as Error).message,
          });
        }
      }

      if (wantsSms && recipient.marketingOptIn.sms && recipient.phone) {
        try {
          await sendSms(recipient.phone, smsMessage!.trim());
          recipientLog.push({ user: recipient.id, name: recipient.name, channel: "sms", status: "sent" });
        } catch (err) {
          recipientLog.push({
            user: recipient.id,
            name: recipient.name,
            channel: "sms",
            status: "failed",
            error: (err as Error).message,
          });
        }
      }
    })
  );

  const sentCount = recipientLog.filter((r) => r.status === "sent").length;
  const failedCount = recipientLog.filter((r) => r.status === "failed").length;

  const campaign = await Campaign.create({
    title: title.trim(),
    sourceType: sourceType as CampaignSourceType,
    product: sourceType === "product" ? productId : undefined,
    promoCode: sourceType === "promotion" ? promoDoc?.id : undefined,
    channels,
    emailSubject: wantsEmail ? emailSubject!.trim() : undefined,
    emailBody: wantsEmail ? emailBody!.trim() : undefined,
    smsMessage: wantsSms ? smsMessage!.trim() : undefined,
    stats: { recipientCount: recipients.length, sentCount, failedCount },
    recipients: recipientLog,
    createdBy: req.userId,
  });

  res.status(201).json(shapeCampaign(campaign));
};

// Surfaced in the campaign form so the admin can see, before sending,
// whether SMS is even wired up yet (see integrations/sms.ts) and roughly
// how many people would receive each channel.
export const getAudiencePreview = async (_req: AuthRequest, res: Response) => {
  const [emailCount, smsCount] = await Promise.all([
    User.countDocuments({ "marketingOptIn.email": true }),
    User.countDocuments({ "marketingOptIn.sms": true, phone: { $exists: true, $ne: "" } }),
  ]);
  res.json({ emailCount, smsCount, smsConfigured: isSmsConfigured() });
};
