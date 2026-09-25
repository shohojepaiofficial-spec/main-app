import { Request, Response } from "express";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { isNonEmptyString } from "../utils/validate";
import { shapeUser } from "./authController";
import {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  generateBackupCodes,
  consumeBackupCode,
  verifyTwoFactorChallenge,
} from "../utils/twoFactor";

const signToken = (id: string, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });

// Only admin/coadmin accounts can turn this on at all — see the user's own
// request. A demoted coadmin who already enabled it keeps being challenged
// on login (nothing here force-disables it), since that's a legitimate
// account-security choice they made, not something a role change should
// silently undo.
function assertEligible(user: InstanceType<typeof User>, res: Response): boolean {
  if (user.role !== "admin" && user.role !== "coadmin") {
    res.status(403).json({ message: "Two-step verification is only available for admin/co-admin accounts" });
    return false;
  }
  return true;
}

// Step 1 of enabling: generates a fresh secret and returns everything needed
// to scan it into an authenticator app. Doesn't touch `enabled` yet — only
// stored as `pendingSecret` until confirmTwoFactor proves it was actually
// set up correctly (see the field's comment in models/User.ts).
export const setupTwoFactor = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!assertEligible(user, res)) return;

  const { secret, otpauthUrl } = generateTwoFactorSecret(user.email);
  user.twoFactor.pendingSecret = secret;
  await user.save();

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  res.json({ secret, otpauthUrl, qrCodeDataUrl });
};

// Step 2: the admin enters a code their app just generated from the pending
// secret. Only on success does it actually become the account's real
// `secret` and 2FA turn on — this is what stops a typo'd/never-scanned
// secret from permanently locking the account out.
export const confirmTwoFactor = async (req: AuthRequest, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!isNonEmptyString(code)) return res.status(400).json({ message: "A code is required" });

  const user = await User.findById(req.userId).select("+twoFactor.pendingSecret");
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!assertEligible(user, res)) return;

  if (!user.twoFactor.pendingSecret) {
    return res.status(400).json({ message: "Start setup first" });
  }
  if (!verifyTwoFactorToken(user.twoFactor.pendingSecret, code)) {
    return res.status(400).json({ message: "That code didn't match — check your app and try again" });
  }

  const { codes, hashes } = generateBackupCodes();
  user.twoFactor.enabled = true;
  user.twoFactor.secret = user.twoFactor.pendingSecret;
  user.twoFactor.pendingSecret = undefined;
  user.twoFactor.backupCodeHashes = hashes;
  await user.save();

  // The only time these plain codes ever exist outside the admin's own
  // password manager/notes — only bcrypt hashes are kept from here on.
  res.json({ message: "Two-step verification enabled", backupCodes: codes });
};

// Requires a valid code (TOTP or an unused backup code) — same idea as
// requiring the current password to change it, proving the requester still
// actually controls the second factor before turning it off.
export const disableTwoFactor = async (req: AuthRequest, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!isNonEmptyString(code)) return res.status(400).json({ message: "A code is required" });

  const user = await User.findById(req.userId).select("+twoFactor.secret +twoFactor.backupCodeHashes");
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.twoFactor.enabled || !user.twoFactor.secret) {
    return res.status(400).json({ message: "Two-step verification isn't enabled" });
  }

  const isValidTotp = verifyTwoFactorToken(user.twoFactor.secret, code);
  const isValidBackup = !isValidTotp && (await consumeBackupCode(user.twoFactor.backupCodeHashes ?? [], code)) !== null;
  if (!isValidTotp && !isValidBackup) {
    return res.status(400).json({ message: "Invalid code" });
  }

  user.twoFactor = { enabled: false };
  await user.save();

  res.json({ message: "Two-step verification disabled" });
};

// The second step of login (see authController.ts#login/oauthSync/
// resetPassword) — exchanges a short-lived challenge token plus a code for
// the account's real access token. Deliberately the same response shape as
// a normal login, so the frontend treats a completed challenge exactly like
// a completed login.
export const verifyTwoFactorLogin = async (req: Request, res: Response) => {
  const { tempToken, code } = req.body as { tempToken?: string; code?: string };
  if (!isNonEmptyString(tempToken) || !isNonEmptyString(code)) {
    return res.status(400).json({ message: "tempToken and code are required" });
  }

  const userId = verifyTwoFactorChallenge(tempToken);
  if (!userId) {
    return res.status(401).json({ message: "This code has expired — please sign in again" });
  }

  const user = await User.findById(userId).select("+twoFactor.secret +twoFactor.backupCodeHashes");
  if (!user || !user.twoFactor.enabled || !user.twoFactor.secret) {
    return res.status(400).json({ message: "Two-step verification isn't enabled on this account" });
  }

  const isValidTotp = verifyTwoFactorToken(user.twoFactor.secret, code);
  let remainingBackupHashes: string[] | null = null;
  if (!isValidTotp) {
    remainingBackupHashes = await consumeBackupCode(user.twoFactor.backupCodeHashes ?? [], code);
  }
  if (!isValidTotp && remainingBackupHashes === null) {
    return res.status(401).json({ message: "Invalid code" });
  }

  if (remainingBackupHashes) {
    user.twoFactor.backupCodeHashes = remainingBackupHashes;
    await user.save();
  }

  const token = signToken(user.id, user.role);
  res.json({ token, user: shapeUser(user) });
};
