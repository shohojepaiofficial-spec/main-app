import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { sendEmail } from "../utils/sendEmail";
import { generateRawAndHash, hashToken } from "../utils/authTokens";
import { verifyUnsubscribeToken } from "../utils/campaignTokens";
import { storeUploadedFile } from "../utils/upload";
import { AuthRequest } from "../middleware/auth";

const signToken = (id: string, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

// Shared response shape for "here's who's logged in" — register/login/getMe/
// updateProfile/oauthSync all return exactly this.
const shapeUser = (user: InstanceType<typeof User>) => ({
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
});

// Fire-and-forget, same convention as the existing "welcome" email — a down
// SMTP server (there's no real one configured until a domain exists) should
// never block or fail the request that triggered the email.
async function sendVerificationEmail(user: InstanceType<typeof User>) {
  const { raw, hash } = generateRawAndHash();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();

  const link = `${CLIENT_URL}/verify-email?token=${raw}`;
  return sendEmail({
    to: user.email,
    subject: "Verify your email",
    html: `<p>Hi ${user.name},</p><p>Please confirm your email address:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
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

  const token = signToken(user.id, user.role);

  res.json({ token, user: shapeUser(user) });
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

  const file = req.file as Express.Multer.File | undefined;
  if (file) user.image = await storeUploadedFile(file);

  await user.save();
  res.json(shapeUser(user));
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
// Google/Facebook sign-in, so an OAuth user gets a real row in `users` and one
// of our own JWTs (the same shape email/password login produces) rather than
// living only inside NextAuth's own session. Protected by requireInternalSecret
// — never call this directly from a browser.
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
      subject: "Welcome to our store",
      html: `<p>Hi ${user.name}, thanks for signing up!</p>`,
    }).catch((err) => console.error("Welcome email failed:", err.message));
  } else {
    let changed = false;
    if (image && user.image !== image) {
      user.image = image;
      changed = true;
    }
    if (!user.providerId && providerId) {
      user.providerId = providerId;
      changed = true;
    }
    if (changed) await user.save();
  }

  const token = signToken(user.id, user.role);

  res.json({ token, user: shapeUser(user) });
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

  try {
    await sendVerificationEmail(user);
  } catch (err) {
    console.error("Verification email failed:", (err as Error).message);
    return res.status(500).json({ message: "Failed to send verification email" });
  }

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
  // OAuth account signs in through Google/Facebook, not here.
  const user = await User.findOne({ email: email.toLowerCase().trim(), provider: "local" });
  if (!user) return res.json(genericResponse);

  const { raw, hash } = generateRawAndHash();
  user.resetPasswordTokenHash = hash;
  user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  const link = `${CLIENT_URL}/reset-password?token=${raw}`;
  sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: `<p>Hi ${user.name},</p><p>Click below to choose a new password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
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

  const jwtToken = signToken(user.id, user.role);
  res.json({ token: jwtToken, user: shapeUser(user) });
};
