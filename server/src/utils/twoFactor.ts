import { authenticator } from "otplib";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ISSUER = "Shohoje Pai";
const BACKUP_CODE_COUNT = 10;
// Short-lived on purpose — this token only proves "password/OAuth already
// checked out, waiting on the second factor," not a real session. Re-signing
// in with Google or re-submitting the password gets a fresh one.
const TWO_FACTOR_CHALLENGE_TTL = "5m";

export function generateTwoFactorSecret(email: string): { secret: string; otpauthUrl: string } {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
  return { secret, otpauthUrl };
}

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

// Human-typeable (uppercase hex, dash in the middle) rather than base64/UUID
// — these get written down or printed, not copy-pasted from a password
// manager. Returns both the plain codes (shown to the admin exactly once)
// and their bcrypt hashes (the only form ever saved to the database).
export function generateBackupCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  const hashes = codes.map((code) => bcrypt.hashSync(code, 10));
  return { codes, hashes };
}

// Checks `input` against every remaining hash and, on a match, returns the
// remaining hashes with that one removed (so it can't be used a second
// time) — or null if nothing matched. Doesn't mutate `hashes` itself; the
// caller is responsible for saving the returned array back.
export async function consumeBackupCode(hashes: string[], input: string): Promise<string[] | null> {
  const normalized = input.trim().toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(normalized, hashes[i])) {
      return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
    }
  }
  return null;
}

export function signTwoFactorChallenge(userId: string): string {
  return jwt.sign({ id: userId, purpose: "2fa" }, process.env.JWT_SECRET as string, {
    expiresIn: TWO_FACTOR_CHALLENGE_TTL,
  });
}

// Returns the user id the challenge was issued for, or null if the token is
// invalid/expired/not actually a 2FA challenge (e.g. someone hands a normal
// access token to this endpoint instead).
export function verifyTwoFactorChallenge(token: string): string | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      purpose?: string;
    };
    return decoded.purpose === "2fa" ? decoded.id : null;
  } catch {
    return null;
  }
}
