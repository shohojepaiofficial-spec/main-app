import { validateControllerInput } from "../middleware/controllerInput";
import { Request, Response } from "express";
import QRCode from "qrcode";
import { hashToken, verifyTypedToken } from "../utils/authTokens";
import { createSession } from "../utils/sessions";
import { User, type UserRole } from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { isNonEmptyString } from "../utils/validate";
import { shapeUser } from "./authController";
import { encryptSecret } from "../utils/secretEncryption";
import {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  generateBackupCodes,
  consumeBackupCode,
} from "../utils/twoFactor";

// Only admin/coadmin accounts can turn this on at all — see the user's own
// request. Login also checks the current role so customers are not challenged.
function assertEligible(user: InstanceType<typeof User>, res: Response): boolean {
  if (user.role !== "admin" && user.role !== "coadmin") {
    res.status(403).json({ message: "Two-step verification is only available for admin/co-admin accounts" });
    return false;
  }
  return true;
}

const MANAGEMENT_WINDOW_SECONDS = 5 * 60;
const staffRoles: { $in: UserRole[] } = { $in: ["admin", "coadmin"] };
const pendingFields = "+twoFactor.pendingSecret +twoFactor.pendingExpires +twoFactor.pendingSessionHash +twoFactor.pendingFactorHash";
const clearPending = { "twoFactor.pendingSecret": 1, "twoFactor.pendingExpires": 1, "twoFactor.pendingSessionHash": 1, "twoFactor.pendingFactorHash": 1 };

// Only a completed password/Google login supplies this signed timestamp.
// Token issuance, password recovery and exchanging a challenge never renew it.
function assertRecentAuthentication(req: AuthRequest, res: Response): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(req.authenticatedAt) || req.authenticatedAt! > now || now - req.authenticatedAt! >= MANAGEMENT_WINDOW_SECONDS) {
    res.status(428).json({ code: "REAUTHENTICATION_REQUIRED", message: "Sign in again before changing two-step verification. Then restart this action within five minutes." });
    return false;
  }
  return true;
}

function sessionHash(req: AuthRequest): string {
  return hashToken(req.headers.authorization ?? "");
}

async function verifyExistingFactor(user: InstanceType<typeof User>, code: unknown): Promise<{ backupHash?: string } | null> {
  if (!isNonEmptyString(code) || code.length > 32 || !user.twoFactor.secret) return null;
  if (verifyTwoFactorToken(user.twoFactor.secret, code)) return {};
  const hashes = user.twoFactor.backupCodeHashes ?? [];
  const remaining = await consumeBackupCode(hashes, code);
  if (remaining === null) return null;
  return { backupHash: hashes.find((hash) => !remaining.includes(hash)) };
}

// Step 1 of enabling: generates a fresh secret and returns everything needed
// to scan it into an authenticator app. Doesn't touch `enabled` yet — only
// stored as `pendingSecret` until confirmTwoFactor proves it was actually
// set up correctly (see the field's comment in models/User.ts).
async function beginSetup(req: AuthRequest, res: Response, replacement: boolean) {
  const user = await User.findById(req.userId).select("+twoFactor.secret +twoFactor.backupCodeHashes");
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!assertEligible(user, res)) return;

  if (user.twoFactor.enabled !== replacement) {
    return res.status(409).json({ message: replacement ? "Enable two-step verification before replacing it." : "Two-step verification is already enabled. Use Replace authenticator instead." });
  }
  if (!assertRecentAuthentication(req, res)) return;
  validateControllerInput(replacement ? "replaceTwoFactor" : "setupTwoFactor", req);

  const proof = replacement ? await verifyExistingFactor(user, req.body?.code) : {};
  if (!proof) return res.status(401).json({ message: "Enter a valid code from your current authenticator or an unused backup code." });

  const { secret, otpauthUrl } = generateTwoFactorSecret(user.email);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  const pending = await User.updateOne(
    {
      _id: user.id, role: staffRoles, "twoFactor.enabled": replacement ? true : { $ne: true },
      ...(replacement ? { "twoFactor.secret": user.twoFactor.secret } : {}),
      ...(proof.backupHash ? { "twoFactor.backupCodeHashes": proof.backupHash } : {}),
    },
    {
      $set: {
        "twoFactor.pendingSecret": encryptSecret(secret),
        "twoFactor.pendingExpires": new Date((req.authenticatedAt! + MANAGEMENT_WINDOW_SECONDS) * 1000),
        "twoFactor.pendingSessionHash": sessionHash(req),
        ...(replacement ? { "twoFactor.pendingFactorHash": hashToken(user.twoFactor.secret!) } : {}),
      },
      ...(!replacement ? { $unset: { "twoFactor.pendingFactorHash": 1 } } : {}),
      ...(proof.backupHash ? { $pull: { "twoFactor.backupCodeHashes": proof.backupHash } } : {}),
    },
  );
  if (!pending.matchedCount) return res.status(409).json({ message: "Account settings changed. Please reload and try again." });

  res.setHeader("Cache-Control", "no-store");
  res.json({ secret, otpauthUrl, qrCodeDataUrl });
}

export const setupTwoFactor = (req: AuthRequest, res: Response) => beginSetup(req, res, false);
export const replaceTwoFactor = (req: AuthRequest, res: Response) => beginSetup(req, res, true);

// Step 2: the admin enters a code their app just generated from the pending
// secret. Only on success does it actually become the account's real
// `secret` and 2FA turn on — this is what stops a typo'd/never-scanned
// secret from permanently locking the account out.
async function confirmSetup(req: AuthRequest, res: Response, replacement: boolean) {
  const { code } = req.body ?? {};
  if (!isNonEmptyString(code)) return res.status(400).json({ message: "A code is required" });

  const user = await User.findById(req.userId).select(`${pendingFields} +twoFactor.secret`);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!assertEligible(user, res)) return;

  if (user.twoFactor.enabled !== replacement) {
    return res.status(409).json({ message: "Two-step verification changed. Restart setup or replacement." });
  }
  if (!assertRecentAuthentication(req, res)) return;
  validateControllerInput(replacement ? "confirmTwoFactorReplacement" : "confirmTwoFactor", req);

  if (!user.twoFactor.pendingSecret || !user.twoFactor.pendingExpires || user.twoFactor.pendingExpires.getTime() <= Date.now() ||
      user.twoFactor.pendingSessionHash !== sessionHash(req) ||
      (replacement ? !user.twoFactor.secret || user.twoFactor.pendingFactorHash !== hashToken(user.twoFactor.secret) : !!user.twoFactor.pendingFactorHash)) {
    return res.status(409).json({ message: "Setup expired or changed. Restart setup in this signed-in session." });
  }
  if (!verifyTwoFactorToken(user.twoFactor.pendingSecret, code)) {
    return res.status(400).json({ message: "That code didn't match — check your app and try again" });
  }

  const { codes, hashes } = generateBackupCodes();
  const confirmed = await User.updateOne(
    {
      _id: user.id,
      role: staffRoles,
      "twoFactor.enabled": replacement ? true : { $ne: true },
      "twoFactor.pendingSecret": user.twoFactor.pendingSecret,
      "twoFactor.pendingSessionHash": sessionHash(req),
      "twoFactor.pendingExpires": { $gt: new Date() },
      ...(replacement ? { "twoFactor.secret": user.twoFactor.secret, "twoFactor.pendingFactorHash": user.twoFactor.pendingFactorHash } : { "twoFactor.pendingFactorHash": { $exists: false } }),
    },
    {
      $set: { "twoFactor.enabled": true, "twoFactor.secret": user.twoFactor.pendingSecret, "twoFactor.backupCodeHashes": hashes },
      $unset: clearPending,
      $inc: { sessionVersion: 1 },
    },
  );
  if (!confirmed.matchedCount) return res.status(409).json({ message: "Setup changed. Please reload and try again." });

  // The only time these plain codes ever exist outside the admin's own
  // password manager/notes — only bcrypt hashes are kept from here on.
  res.setHeader("Cache-Control", "no-store");
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.twoFactor.enabled = true;
  res.json({ message: replacement ? "Authenticator replaced" : "Two-step verification enabled", backupCodes: codes,
    ...await createSession(user, req.authenticatedAt), user: shapeUser(user) });
}

export const confirmTwoFactor = (req: AuthRequest, res: Response) => confirmSetup(req, res, false);
export const confirmTwoFactorReplacement = (req: AuthRequest, res: Response) => confirmSetup(req, res, true);

// Requires a valid code (TOTP or an unused backup code) — same idea as
// requiring the current password to change it, proving the requester still
// actually controls the second factor before turning it off.
export const disableTwoFactor = async (req: AuthRequest, res: Response) => {
  const { code } = req.body ?? {};
  if (!isNonEmptyString(code)) return res.status(400).json({ message: "A code is required" });

  const user = await User.findById(req.userId).select("+twoFactor.secret +twoFactor.backupCodeHashes");
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!assertEligible(user, res)) return;
  if (!user.twoFactor.enabled || !user.twoFactor.secret) {
    return res.status(400).json({ message: "Two-step verification isn't enabled" });
  }
  if (!assertRecentAuthentication(req, res)) return;
  validateControllerInput("disableTwoFactor", req);

  const proof = await verifyExistingFactor(user, code);
  if (!proof) {
    return res.status(400).json({ message: "Invalid code" });
  }

  const disabled = await User.updateOne({
    _id: user.id, role: staffRoles, "twoFactor.enabled": true, "twoFactor.secret": user.twoFactor.secret,
    ...(proof.backupHash ? { "twoFactor.backupCodeHashes": proof.backupHash } : {}),
  }, { $set: { twoFactor: { enabled: false } }, $inc: { sessionVersion: 1 } });
  if (!disabled.matchedCount) return res.status(409).json({ message: "Account settings changed. Please reload and try again." });

  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.twoFactor.enabled = false;
  res.setHeader("Cache-Control", "no-store");
  res.json({ message: "Two-step verification disabled", ...await createSession(user, req.authenticatedAt), user: shapeUser(user) });
};

// The second step of login (see authController.ts#login/oauthSync/
// resetPassword) — exchanges a short-lived challenge token plus a code for
// the account's real access token. Deliberately the same response shape as
// a normal login, so the frontend treats a completed challenge exactly like
// a completed login.
export const verifyTwoFactorLogin = async (req: Request, res: Response) => {
  validateControllerInput("verifyTwoFactorLogin", req);
  const { tempToken, code } = req.body as { tempToken?: string; code?: string };
  if (!isNonEmptyString(tempToken) || !isNonEmptyString(code)) {
    return res.status(400).json({ message: "tempToken and code are required" });
  }

  let challenge: ReturnType<typeof verifyTypedToken>;
  try {
    challenge = verifyTypedToken(tempToken, "2fa");
  } catch {
    return res.status(401).json({ message: "This code has expired — please sign in again" });
  }

  const user = await User.findById(challenge.id).select("+twoFactor.secret +twoFactor.backupCodeHashes");
  if (user && !assertEligible(user, res)) return;
  if (!user || !user.twoFactor.enabled || !user.twoFactor.secret) {
    return res.status(400).json({ message: "Two-step verification isn't enabled on this account" });
  }
  if (challenge.version !== (user.sessionVersion ?? 0)) {
    return res.status(401).json({ message: "Account security changed. Please sign in again." });
  }

  const isValidTotp = verifyTwoFactorToken(user.twoFactor.secret, code);
  let remainingBackupHashes: string[] | null = null;
  if (!isValidTotp) {
    remainingBackupHashes = await consumeBackupCode(user.twoFactor.backupCodeHashes ?? [], code);
  }
  if (!isValidTotp && remainingBackupHashes === null) {
    return res.status(401).json({ message: "Invalid code" });
  }

  if (remainingBackupHashes !== null) {
    const backupHash = user.twoFactor.backupCodeHashes!.find((hash) => !remainingBackupHashes!.includes(hash));
    const consumed = await User.updateOne({
      _id: user.id, role: staffRoles, "twoFactor.enabled": true,
      "twoFactor.secret": user.twoFactor.secret, "twoFactor.backupCodeHashes": backupHash,
    }, { $pull: { "twoFactor.backupCodeHashes": backupHash } });
    if (!consumed.matchedCount) return res.status(401).json({ message: "This backup code was already used or your account settings changed." });
  }

  const authenticatedAt = challenge.authenticatedAt;
  res.setHeader("Cache-Control", "no-store");
  res.json({ ...await createSession(user, Number.isSafeInteger(authenticatedAt) ? authenticatedAt : undefined), user: shapeUser(user) });
};
