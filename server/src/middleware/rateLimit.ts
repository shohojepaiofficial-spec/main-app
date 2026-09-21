import rateLimit from "express-rate-limit";

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
