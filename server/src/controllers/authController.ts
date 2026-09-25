import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { sendEmail } from "../utils/sendEmail";
import { generateRawAndHash, hashToken } from "../utils/authTokens";
import { verifyUnsubscribeToken } from "../utils/campaignTokens";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import { signTwoFactorChallenge } from "../utils/twoFactor";
import { AuthRequest } from "../middleware/auth";

const signToken = (id: string, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });

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
  twoFactorEnabled: user.twoFactor?.enabled ?? false,
});

// Every place that verifies a credential and would normally hand back a
// real session (login, oauth-sync, password reset) routes through here
// instead of signing a token directly, so a 2FA-enabled admin/coadmin gets
// challenged at all three, not just the one path someone remembered to gate.
function respondWithSessionOrChallenge(res: Response, user: InstanceType<typeof User>) {
  if (user.twoFactor?.enabled) {
    return res.json({ twoFactorRequired: true, tempToken: signTwoFactorChallenge(user.id) });
  }
  const token = signToken(user.id, user.role);
  return res.json({ token, user: shapeUser(user) });
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
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user.id, user.role);

  sendVerificationEmail(user).catch((err) => console.error("Verification email failed:", err.message));

  res.status(201).json({ token, user: shapeUser(user) });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  respondWithSessionOrChallenge(res, user);
};

// Lets an already-logged-in client refresh its cached `user` (role/
// permissions) without a full re-login — needed because those live only in
// the login/register response and the zustand store from then on, so an
// admin changing a coadmin's access mid-session wouldn't otherwise show up
// until they logged out and back in.
export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json(shapeUser(user));
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
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
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
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

  user.password = newPassword;
  await user.save();

  res.json({ message: "Password updated" });
};

export const updateDeliveryLocation = async (req: AuthRequest, res: Response) => {
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
  const { uid, token } = req.query as { uid?: string; token?: string };
  if (!uid || !token || !verifyUnsubscribeToken(uid, token)) {
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
  const { name, email, provider, providerId, image } = req.body;

  if (!email || !provider) {
    return res.status(400).json({ message: "email and provider are required" });
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: name || email.split("@")[0],
      email,
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

  respondWithSessionOrChallenge(res, user);
};

// Re-sends the verification email for the currently logged-in account —
// used by the "Resend email" button on the verify-your-email banner. A
// fresh token replaces the old one each time, so an old, unused email link
// stops working once a new one is requested.
export const resendVerificationEmail = async (req: AuthRequest, res: Response) => {
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
  const { token } = req.body as { token?: string };
  if (!token) return res.status(400).json({ message: "Missing token" });

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
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ message: "Email is required" });

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
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const user = await User.findOne({
    resetPasswordTokenHash: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordTokenHash +resetPasswordExpires");

  if (!user) {
    return res.status(400).json({ message: "This reset link is invalid or has expired" });
  }

  user.password = password;
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  respondWithSessionOrChallenge(res, user);
};
