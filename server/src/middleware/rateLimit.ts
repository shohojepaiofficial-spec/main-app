import { Request } from "express";
import createRateLimit, { type Options } from "express-rate-limit";
import { MongoRateStore } from "./mongoRateStore";
import { clientIpKey } from "./clientIp";
import { createHash } from "node:crypto";
import type { AuthRequest } from "./auth";
import { verifyTypedToken } from "../utils/authTokens";
let limiterId = 0;
function rateLimit(options: Partial<Options>) {
  const prefix = `limiter-${++limiterId}`;
  return createRateLimit({ keyGenerator: clientIpKey, ...options, ...(process.env.NODE_ENV === "production" ? { store: new MongoRateStore(prefix) } : {}), passOnStoreError: false });
}

// Login/register/password-reset are the classic brute-force, credential-
// stuffing, and email-bombing targets — none of them have an account to key
// off yet (the request is what's trying to prove one), so this is capped per
// IP rather than per user.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts — please try again later." },
});

export const authTargetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => typeof req.body?.email === "string" ? createHash("sha256").update(req.body.email.trim().toLowerCase()).digest("hex") : clientIpKey(req),
  message: { message: "Too many attempts for this account. Please try again later." },
});

export const sessionRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many session refresh requests. Please try again later." },
});

// The public contact form has no auth at all, so it's the easiest thing on
// the site to spam — and once real mail-provider/CONTACT_EMAIL credentials
// exist, the easiest way to run up a sending bill or flood an inbox.
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages sent — please try again later." },
});

// Every upload/review route below sits behind `protect`, so these are keyed
// per account — one shared office/mobile-carrier IP (common in Bangladesh)
// shouldn't throttle every shopper behind it, and a single abuser can't dodge
// the cap by hopping IPs. Falls back to the IP (via ipKeyGenerator, which
// groups an IPv6 /56 so a client can't rotate through its own addresses)
// should one ever be mounted without auth.
const perAccount = (req: Request) => (req as AuthRequest).userId ?? clientIpKey(req);

export const checkoutIpLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
export const checkoutAccountLimiter = rateLimit({ windowMs: 60_000, limit: 10, keyGenerator: perAccount, standardHeaders: true, legacyHeaders: false });
// Customer checkout only: each order texts the phone typed in, so a day's
// cap bounds what one account can spend of the SMS balance (with the
// open-order cap in createOrder and the per-phone cap in orderStatusSms).
// Payment-link payments have no signed-in account to key a limiter on, so
// sharedCartController applies the same number by counting the asker's orders.
export const CHECKOUT_DAILY_LIMIT = 10;
export const checkoutDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, limit: CHECKOUT_DAILY_LIMIT, keyGenerator: perAccount, standardHeaders: true, legacyHeaders: false,
  // Only placed orders count; a rejected attempt (out of stock, bad phone) does not.
  skipFailedRequests: true,
  message: { message: "You've placed a lot of orders today. Please try again tomorrow or contact us." },
});
export const quoteLimiter = rateLimit({ windowMs: 60_000, limit: 30, keyGenerator: perAccount, standardHeaders: true, legacyHeaders: false });
export const apiLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false });

export const twoFactorManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: perAccount,
  message: { message: "Too many two-step verification attempts. Please try again later." },
});

// Public and unauthenticated (guest visitors are tracked too), so it's the
// easiest endpoint to flood with fake events and skew the analytics. A real
// visitor sends a handful of events per page, so this only ever stops a
// script. The frontend's tracker already ignores failures, so a throttled
// request costs a real visitor nothing.
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please slow down." },
});

// A customer reviewing everything from a big order in one sitting is fine;
// dozens of reviews an hour from one account is spam.
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: perAccount,
  message: { message: "You've posted a lot of reviews recently — please try again later." },
});

// Image uploads each cost memory (multer buffers up to 5 × 5MB per request)
// and, once Cloudinary is on, real storage/bandwidth. Mount these *before*
// the multer middleware, so a throttled request is refused before its files
// are ever read into memory.
//
// Admin/co-admin forms (products, banners, ads) — generous enough for a long
// catalog-editing session, since every save of those forms is multipart.
export const adminUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: perAccount,
  message: { message: "Too many uploads in a short time — please wait a few minutes and try again." },
});

// Profile updates are open to every customer account. The profile form is
// always sent as multipart (with or without a new photo), so this counts
// every profile save, not just photo changes — still far above what a real
// person does in an hour.
export const profileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: perAccount,
  message: { message: "Too many profile updates — please try again later." },
});

// Second step of staff sign-in. authLimiter caps each IP; this caps each
// account, so many IPs can't share the guessing of one person's code. The
// challenge token says whose sign-in it is; an unreadable one falls back to
// the IP (the controller refuses it anyway).
export function twoFactorChallengeKey(req: Request) {
  try {
    const tempToken = req.body?.tempToken;
    if (typeof tempToken === "string" && tempToken.length <= 4096) return `2fa:${verifyTypedToken(tempToken, "2fa").id}`;
  } catch { /* fall through */ }
  return clientIpKey(req);
}
export const twoFactorLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: twoFactorChallengeKey,
  message: { message: "Too many two-step verification attempts. Please try again later." },
});

// The public "check this promo code" box. Private codes aren't listed
// anywhere (SEC-22), so this stops a script trying names one by one; a
// shopper typing a code or two never comes close.
export const promoValidateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many promo code attempts. Please try again later." },
});
