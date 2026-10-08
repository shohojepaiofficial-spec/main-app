import { validateControllerInput } from "../middleware/controllerInput";
import { Request, Response } from "express";
import { User } from "../models/User";
import { sendEmail } from "../utils/sendEmail";
import { generateRawAndHash, hashToken } from "../utils/authTokens";
import bcrypt from "bcryptjs";
import { createSession, revokeSession, rotateSession, SessionError } from "../utils/sessions";
import { verifyUnsubscribeToken } from "../utils/campaignTokens";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import { signTwoFactorChallenge } from "../utils/twoFactor";
import { isNonEmptyString } from "../utils/validate";
import { AuthRequest } from "../middleware/auth";
import { validNewPassword, PASSWORD_POLICY_MESSAGE } from "../utils/passwordPolicy";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

// Shared response shape for "here's who's logged in" — register/login/getMe/
// updateProfile/oauthSync all return exactly this. Exported so
// twoFactorController's verify-login endpoint (the other place a real
// session gets issued) produces an identical shape.
export const shapeUser = (user: InstanceType<typeof User>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: user.permissions,
  provider: user.provider,
  image: user.image,
  phone: user.phone,
  deliveryLocation: user.deliveryLocation,
  isEmailVerified: user.isEmailVerified,
  marketingOptIn: user.marketingOptIn,
  twoFactorEnabled: (user.role === "admin" || user.role === "coadmin") && (user.twoFactor?.enabled ?? false),
});

// Every place that verifies a credential and would normally hand back a
// real session (login, oauth-sync, password reset) routes through here
// instead of signing a token directly, so a 2FA-enabled admin/coadmin gets
// challenged at all three, not just the one path someone remembered to gate.
async function respondWithSessionOrChallenge(res: Response, user: InstanceType<typeof User>, authenticatedAt?: number) {
  res.setHeader("Cache-Control", "no-store");
  if ((user.role === "admin" || user.role === "coadmin") && user.twoFactor?.enabled) {
    return res.json({ twoFactorRequired: true, tempToken: signTwoFactorChallenge(user.id, authenticatedAt, user.sessionVersion ?? 0) });
  }
  return res.json({ ...await createSession(user, authenticatedAt), user: shapeUser(user) });
}

// Fire-and-forget, same convention as the existing "welcome" email — a
// down/unconfigured mail provider should never block or fail the request
// that triggered the email.
async function sendVerificationEmail(user: InstanceType<typeof User>) {
  const { raw, hash } = generateRawAndHash();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();

  const link = `${CLIENT_URL}/verify-email?token=${raw}`;
  // Real prose around a single, non-duplicated link — an HTML-only email
  // whose body is mostly a bare URL (repeated as both the href and the
  // visible link text, as this used to do) reads as spam to a lot of
  // receiving mail servers and can get the whole message bounced outright,
  // not just filtered. See the `text` fallback part too, added for the
  // same reason.
  return sendEmail({
    to: user.email,
    subject: "Confirm your email address for Shohoje Pai",
    html: `<p>Hi ${user.name},</p><p>Thanks for creating an account with Shohoje Pai. Before you can sign in, we just need to confirm this is really your email address.</p><p><a href="${link}" style="display:inline-block;background:#15914f;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Confirm my email address</a></p><p>This link stays valid for the next 24 hours. If the button above doesn't work, copy this address into your browser: ${link}</p><p>If you didn't create this account, you can safely ignore this email.</p>`,
    text: `Hi ${user.name},\n\nThanks for creating an account with Shohoje Pai. Before you can sign in, we just need to confirm this is really your email address.\n\nConfirm it here (valid for the next 24 hours):\n${link}\n\nIf you didn't create this account, you can safely ignore this email.`,
  });
}

export const register = async (req: Request, res: Response) => {
  validateControllerInput("register", req);
  const { name, email, password } = req.body;

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "name, email and password are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (existing.provider === "google") {
      return res.status(409).json({ code: "GOOGLE_LOGIN_REQUIRED", message: "This account uses Google. Please continue with Google." });
    }
    return res.status(409).json({ message: "Email already registered" });
  }

  if (!validNewPassword(password)) return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  const user = await User.create({ name, email: normalizedEmail, password });
  const credentials = await createSession(user);

  sendVerificationEmail(user).catch((err) => console.error("Verification email failed:", err.message));

  res.setHeader("Cache-Control", "no-store");
  res.status(201).json({ ...credentials, user: shapeUser(user) });
};

export const login = async (req: Request, res: Response) => {
  validateControllerInput("login", req);
  const { email, password } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (user && user.provider !== "local") {
    return res.status(401).json({ code: "GOOGLE_LOGIN_REQUIRED", message: "This account uses Google. Please continue with Google." });
  }
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  await respondWithSessionOrChallenge(res, user, Math.floor(Date.now() / 1000));
};

// Lets an already-logged-in client refresh its cached `user` (role/
// permissions) without a full re-login — needed because those live only in
// the login/register response and the zustand store from then on, so an
// admin changing a coadmin's access mid-session wouldn't otherwise show up
// until they logged out and back in.
export const getMe = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getMe", req);
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json(shapeUser(user));
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateProfile", req);
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const { name, phone } = req.body as { name?: string; phone?: string };
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ message: "Name can't be empty" });
    user.name = name.trim();
  }
  if (phone !== undefined) user.phone = phone.trim() || undefined;

  // `user.image` may be a self-uploaded file or a Google OAuth avatar URL —
  // deleteUploadedFile below only ever acts on our own Cloudinary folder or
  // local /uploads path, so an OAuth URL here is safely left alone rather
  // than needing a separate check.
  const file = req.file as Express.Multer.File | undefined;
  let previousImage: string | undefined;
  if (file) {
    previousImage = user.image;
    user.image = await storeUploadedFile(file);
  }

  await user.save();
  res.json(shapeUser(user));

  if (previousImage) await deleteUploadedFile(previousImage);
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  validateControllerInput("changePassword", req);
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }
  if (!validNewPassword(newPassword)) {
    return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  }

  const user = await User.findById(req.userId).select("+password");
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.provider !== "local") {
    return res
      .status(400)
      .json({ message: `This account signs in via ${user.provider} and has no password to change` });
  }

  const matches = await user.comparePassword(currentPassword);
  if (!matches) return res.status(401).json({ message: "Current password is incorrect" });

  const updated = await User.findOneAndUpdate({ _id: user.id, password: user.password }, {
    $set: { password: await bcrypt.hash(newPassword, 10) },
    $inc: { sessionVersion: 1 },
    $unset: { resetPasswordTokenHash: 1, resetPasswordExpires: 1 },
  }, { new: true });
  if (!updated) return res.status(409).json({ message: "Password changed during this request. Please sign in again." });

  res.json({ message: "Password updated. Please sign in again on your devices." });
};

export const updateDeliveryLocation = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateDeliveryLocation", req);
  const { zila, upazila, addressLine } = req.body as {
    zila?: string;
    upazila?: string;
    addressLine?: string;
  };

  if (!zila?.trim()) return res.status(400).json({ message: "Zila is required" });
  if (!upazila?.trim()) return res.status(400).json({ message: "Upazila is required" });
  if (!addressLine?.trim()) return res.status(400).json({ message: "Address is required" });

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.deliveryLocation = {
    zila: zila.trim(),
    upazila: upazila.trim(),
    addressLine: addressLine.trim(),
  };
  await user.save();

  res.json(shapeUser(user));
};

// Shared by Settings' "Promotions" section and the checkout page's "Send me
// SMS about offers" checkbox — both just flip one or both of these flags.
export const updateMarketingOptIn = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateMarketingOptIn", req);
  const { email, sms } = req.body as { email?: boolean; sms?: boolean };

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (sms && !user.phone) {
    return res.status(400).json({ message: "Add a phone number before enabling SMS updates" });
  }

  if (email !== undefined) user.marketingOptIn.email = email;
  if (sms !== undefined) user.marketingOptIn.sms = sms;
  await user.save();

  res.json(shapeUser(user));
};

// The one-click link at the bottom of every marketing campaign email (see
// campaignController.ts#createCampaign) — public, no login required, since
// clicking a link in an email shouldn't require having an active session on
// whatever device opens it. Only ever turns email marketing off, never the
// whole account or SMS opt-in.
export const unsubscribeFromMarketing = async (req: Request, res: Response) => {
  validateControllerInput("unsubscribeFromMarketing", req);
  const { uid, token } = req.query as { uid?: string; token?: string };
  if (!isNonEmptyString(uid) || !isNonEmptyString(token) || !verifyUnsubscribeToken(uid, token)) {
    return res.status(400).json({ message: "This unsubscribe link is invalid." });
  }

  const user = await User.findById(uid);
  if (!user) return res.status(404).json({ message: "Account not found." });

  user.marketingOptIn.email = false;
  await user.save();

  res.json({ message: "You've been unsubscribed from marketing emails." });
};

// Called server-to-server by the Next.js app's NextAuth callback right after a
// Google sign-in, so an OAuth user gets a real row in `users` and one of our
// own JWTs (the same shape email/password login produces) rather than living
// only inside NextAuth's own session. Protected by requireInternalSecret —
// never call this directly from a browser.
export const oauthSync = async (req: Request, res: Response) => {
  validateControllerInput("oauthSync", req);
  const { name, email, provider, providerId, image } = req.body;

  // "google" is the only OAuth provider this app supports (Facebook sign-in
  // was removed — see docs/PROGRESS.md) — reject anything else outright
  // rather than letting an arbitrary string reach User.create below.
  if (!isNonEmptyString(email) || provider !== "google" || !isNonEmptyString(providerId)) {
    return res.status(400).json({ message: "email, Google provider and providerId are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (user && user.provider !== "google") {
    return res.status(409).json({ code: "LOCAL_LOGIN_REQUIRED", message: "This email uses email and password sign-in. Please sign in with your password." });
  }

  if (user?.providerId && user.providerId !== providerId) {
    return res.status(401).json({ message: "This Google account does not match the registered account." });
  }

  if (!user) {
    user = await User.create({
      name: name || email.split("@")[0],
      email: normalizedEmail,
      provider,
      providerId,
      image,
    });

    sendEmail({
      to: user.email,
      subject: "Welcome to Shohoje Pai",
      html: `<p>Hi ${user.name}, thanks for signing up with Shohoje Pai!</p>`,
      text: `Hi ${user.name}, thanks for signing up with Shohoje Pai!`,
    }).catch((err) => console.error("Welcome email failed:", err.message));
  } else {
    let changed = false;
    // Only set it if the account has no image at all yet — otherwise every
    // future Google sign-in would silently overwrite a profile picture the
    // user uploaded themselves in Settings back to their Google avatar.
    if (image && !user.image) {
      user.image = image;
      changed = true;
    }
    if (!user.providerId && providerId) {
      user.providerId = providerId;
      changed = true;
    }
    if (changed) await user.save();
  }

  await respondWithSessionOrChallenge(res, user, Math.floor(Date.now() / 1000));
};

// Re-sends the verification email for the currently logged-in account —
// used by the "Resend email" button on the verify-your-email banner. A
// fresh token replaces the old one each time, so an old, unused email link
// stops working once a new one is requested.
export const resendVerificationEmail = async (req: AuthRequest, res: Response) => {
  validateControllerInput("resendVerificationEmail", req);
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.provider !== "local") {
    return res.status(400).json({ message: "This account is already verified" });
  }
  if (user.isEmailVerified) {
    return res.status(400).json({ message: "This email is already verified" });
  }

  // Fire-and-forget, same convention as every other email in this app
  // (including this exact template's other call site in `register`, just
  // above) — this used to `await` the send directly, so a slow/unreachable
  // mail server hung the whole request and then 500'd, instead of just
  // logging it server-side and letting the request succeed immediately like
  // everywhere else.
  sendVerificationEmail(user).catch((err) => console.error("Verification email failed:", err.message));

  res.json({ message: "Verification email sent" });
};

// The verify-email page (public) posts the token straight from its URL —
// no login required, since a brand-new signup may not have a session yet on
// whatever device/browser opens the email link.
export const verifyEmail = async (req: Request, res: Response) => {
  validateControllerInput("verifyEmail", req);
  const { token } = req.body as { token?: string };
  if (!isNonEmptyString(token)) return res.status(400).json({ message: "Missing token" });

  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationExpires");

  if (!user) {
    return res.status(400).json({ message: "This verification link is invalid or has expired" });
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: "Email verified" });
};

// Always responds the same way whether or not the email is registered, so
// this can't be used to check which emails have an account (user
// enumeration) — the real work only happens when a match is found.
export const forgotPassword = async (req: Request, res: Response) => {
  validateControllerInput("forgotPassword", req);
  const { email } = req.body as { email?: string };
  if (!isNonEmptyString(email)) return res.status(400).json({ message: "Email is required" });

  const genericResponse = {
    message: "If an account with that email exists, we've sent a password reset link.",
  };

  // Only a local (email/password) account has a password to reset — an
  // OAuth account signs in through Google, not here.
  const user = await User.findOne({ email: email.toLowerCase().trim(), provider: "local" });
  if (!user) return res.json(genericResponse);

  const { raw, hash } = generateRawAndHash();
  user.resetPasswordTokenHash = hash;
  user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  const link = `${CLIENT_URL}/reset-password?token=${raw}`;
  sendEmail({
    to: user.email,
    subject: "Reset your Shohoje Pai password",
    html: `<p>Hi ${user.name},</p><p>We received a request to reset the password on your Shohoje Pai account.</p><p><a href="${link}" style="display:inline-block;background:#15914f;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Choose a new password</a></p><p>This link stays valid for the next hour. If the button above doesn't work, copy this address into your browser: ${link}</p><p>If you didn't request this, you can safely ignore this email — your password won't be changed.</p>`,
    text: `Hi ${user.name},\n\nWe received a request to reset the password on your Shohoje Pai account.\n\nChoose a new password here (valid for the next hour):\n${link}\n\nIf you didn't request this, you can safely ignore this email — your password won't be changed.`,
  }).catch((err) => console.error("Password reset email failed:", err.message));

  res.json(genericResponse);
};

// Resets the password and logs the account straight in (same shape as
// login) — the token already proved control of the email inbox, so there's
// no reason to also make them type their new password in again to sign in.
export const resetPassword = async (req: Request, res: Response) => {
  validateControllerInput("resetPassword", req);
  const { token, password } = req.body as { token?: string; password?: string };
  if (!isNonEmptyString(token) || !isNonEmptyString(password)) {
    return res.status(400).json({ message: "Token and password are required" });
  }
  if (!validNewPassword(password)) {
    return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  }

  const user = await User.findOne({
    resetPasswordTokenHash: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordTokenHash +resetPasswordExpires");

  if (!user) {
    return res.status(400).json({ message: "This reset link is invalid or has expired" });
  }

  const updated = await User.findOneAndUpdate({
    _id: user.id, resetPasswordTokenHash: hashToken(token), resetPasswordExpires: { $gt: new Date() },
  }, {
    $set: { password: await bcrypt.hash(password, 10) },
    $inc: { sessionVersion: 1 },
    $unset: { resetPasswordTokenHash: 1, resetPasswordExpires: 1 },
  }, { new: true });
  if (!updated) return res.status(400).json({ message: "This reset link is invalid or has expired" });

  await respondWithSessionOrChallenge(res, updated);
};

export const refreshSession = async (req: Request, res: Response) => {
  validateControllerInput("refreshSession", req);
  if (!isNonEmptyString(req.body?.refreshToken) || req.body.refreshToken.length > 4096) {
    return res.status(400).json({ message: "A refresh token is required" });
  }
  res.setHeader("Cache-Control", "no-store");
  try {
    const { user, ...credentials } = await rotateSession(req.body.refreshToken);
    res.json({ ...credentials, user: shapeUser(user) });
  } catch (error) {
    if (error instanceof SessionError) return res.status(401).json({ code: error.code, message: error.message });
    throw error;
  }
};

export const logoutSession = async (req: AuthRequest, res: Response) => {
  validateControllerInput("logoutSession", req);
  await revokeSession(req.sessionId!, req.userId!);
  res.json({ message: "Logged out" });
};

export const logoutAllSessions = async (req: AuthRequest, res: Response) => {
  validateControllerInput("logoutAllSessions", req);
  await User.updateOne({ _id: req.userId }, { $inc: { sessionVersion: 1 } });
  res.json({ message: "Logged out on all devices" });
};
