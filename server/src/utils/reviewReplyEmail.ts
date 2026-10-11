import { User } from "../models/User";
import { sendEmail } from "./sendEmail";
import { escapeHtml } from "./escapeHtml";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Tells a customer the store answered their review. Only the first reply
// sends this (edits don't re-notify). Fire-and-forget like every other
// email here: a mail hiccup must never fail the admin's reply.
export function notifyReviewReply(review: { user: unknown; product: unknown; reply?: { text?: string } | null }) {
  sendReplyEmail(review).catch((err) => console.error("Review reply email failed:", (err as Error).message));
}

async function sendReplyEmail(review: { user: unknown; product: unknown; reply?: { text?: string } | null }) {
  const reply = review.reply?.text;
  if (!reply) return;
  const customer = await User.findById(review.user).select("name email");
  if (!customer?.email) return;
  const product = review.product as { _id?: unknown; name?: string } | null;
  const productName = product?.name ?? "your purchase";
  const link = `${CLIENT_URL}/shop/${String(product?._id ?? "")}`;
  await sendEmail({
    to: customer.email,
    subject: `Shohoje Pai replied to your review of ${productName}`,
    html: `<p>Hi ${escapeHtml(customer.name)},</p><p>Thanks for reviewing <strong>${escapeHtml(productName)}</strong>. Our team has replied:</p><blockquote style="margin:0;padding:8px 12px;border-left:3px solid #15914f;color:#333">${escapeHtml(reply).replace(/\n/g, "<br>")}</blockquote><p><a href="${link}">See your review and the reply</a></p>`,
    text: `Hi ${customer.name},\n\nThanks for reviewing ${productName}. Our team has replied:\n\n${reply}\n\nSee your review and the reply:\n${link}`,
  });
}
