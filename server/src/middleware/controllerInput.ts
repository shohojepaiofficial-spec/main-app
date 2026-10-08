import type { Request } from "express";
import { z } from "zod";
import { assertSafeInput, productInput } from "./requestValidation";
import { cartItems, objectId, checkoutSchema, parseInput } from "../utils/checkoutValidation";

const fields: Record<string, string> = {
  register: "name email password", login: "email password", updateProfile: "name phone",
  changePassword: "currentPassword newPassword", updateDeliveryLocation: "zila upazila addressLine",
  updateMarketingOptIn: "email sms", oauthSync: "name email provider providerId image",
  verifyEmail: "token", forgotPassword: "email", resetPassword: "token password", refreshSession: "refreshToken",
  setupTwoFactor: "", replaceTwoFactor: "code", confirmTwoFactor: "code", confirmTwoFactorReplacement: "code",
  disableTwoFactor: "code", verifyTwoFactorLogin: "tempToken code",
  createSharedCart: "items", getDeliveryQuote: "items zila upazila",
  updateOrderStatus: "status", bulkUpdateStatus: "ids status", updateOrderNote: "note",
  updateCourierInfo: "consignmentId trackingStatus note", bookPathaoOrder: "cityId zoneId areaId weightKg description specialInstruction",
  createAd: "title sourceType productId promoCode caption link platforms", publishAd: "platforms",
  createCampaign: "title sourceType productId promoCode channels emailSubject emailBody smsMessage",
  createBanner: "eyebrow accentColor title subtitle primaryCta secondaryCta promoCodeId isActive",
  updateBanner: "eyebrow accentColor title subtitle primaryCta secondaryCta promoCodeId isActive", reorderBanner: "direction",
  createPromoCode: "code discountType value scope productId isActive expiresAt", updatePromoCode: "code discountType value scope productId isActive expiresAt",
  validatePromoCode: "code productId", trackEvent: "type path productId sessionId referrer",
  submitReview: "rating comment", replyToReview: "text", updateReviewReply: "text",
  updateUserAccess: "role permissions", updateTranslation: "bn", moveBanner: "direction",
  submitContactMessage: "name email subject message", markMessageRead: "isRead",
};
const numeric = new Set(["rating", "value", "cityId", "zoneId", "areaId", "weightKg"]);
const booleans = new Set(["isRead", "sms"]);
const strings = z.string().max(32_768);

export function validateControllerInput(name: string, req: Request) {
  for (const [key, value] of Object.entries(req.params ?? {})) {
    if (["id", "reviewId", "productId"].includes(key)) parseInput(objectId, value);
    else if (typeof value !== "string" || value.length > 200) throw Object.assign(new Error("Invalid route parameter"), { status: 400 });
  }
  assertSafeInput(req.body);
  if (["createProduct", "updateProduct"].includes(name)) { productInput(req.body); return; }
  if (name === "createOrder" || name === "adminCreateOrder") { parseInput(name === "createOrder" ? checkoutSchema : checkoutSchema.omit({ sharedCartId: true }), req.body); return; }
  if (!(name in fields)) {
    if (req.body !== undefined && !["GET", "HEAD"].includes(req.method ?? "GET")) parseInput(z.object({}).strict(), req.body);
    return;
  }
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields[name].split(" ").filter(Boolean)) {
    let schema: z.ZodTypeAny = strings;
    if (numeric.has(field)) schema = z.number().finite().min(0).max(10_000_000);
    if (field === "rating") schema = z.number().int().min(1).max(5);
    if (field === "direction") schema = z.enum(["up", "down"]);
    if (field === "role") schema = z.enum(["user", "admin", "coadmin"]);
    if (field === "status") schema = z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]);
    if (booleans.has(field) || name === "updateMarketingOptIn") schema = z.boolean();
    if (field === "isActive") schema = z.union([z.boolean(), z.enum(["true", "false"])]);
    if (field === "items") schema = cartItems;
    if (field === "ids") schema = z.array(objectId).min(1).max(100);
    if (field === "permissions" || field === "channels") schema = z.array(z.string().max(100)).max(30);
    if (field === "platforms") schema = z.union([z.array(z.string().max(100)).max(10), z.string().max(500)]);
    if (field === "expiresAt") schema = z.string().datetime().nullable();
    if (["productId", "promoCodeId"].includes(field)) schema = z.union([objectId, z.literal("")]);
    shape[field] = schema.optional();
  }
  parseInput(z.object(shape).strict(), req.body ?? {});
}
