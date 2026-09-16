import crypto from "crypto";

// Used for both email verification and password reset links. The raw token
// goes in the emailed link; only its hash is ever stored, so a database leak
// alone can't be used to verify an email or reset a password — same
// principle as never storing a plaintext password.
export function generateRawAndHash(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
