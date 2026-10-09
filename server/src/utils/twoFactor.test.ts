import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticator } from "otplib";
import { encryptSecret } from "./secretEncryption";
import { verifyTwoFactorToken } from "./twoFactor";

// Public fixture, never an account's actual factor.
const secret = "JBSWY3DPEHPK3PXP";
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T00:00:00Z"));
  vi.stubEnv("TOTP_ENCRYPTION_KEY_ID", "test");
  vi.stubEnv("TOTP_ENCRYPTION_KEYS", JSON.stringify({ test: Buffer.alloc(32, 1).toString("base64") }));
  vi.stubEnv("TOTP_ALLOW_LEGACY_PLAINTEXT", "false");
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("authenticator verification during encryption rollout", () => {
  it.each(["development", "production", "test"])("reports an unmigrated secret as a configuration failure in %s", (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    expect(() => verifyTwoFactorToken(secret, authenticator.generate(secret))).toThrow("TOTP secret could not be read");
  });

  it("accepts an existing authenticator only with explicit legacy compatibility", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TOTP_ENCRYPTION_KEYS", "{}");
    vi.stubEnv("TOTP_ALLOW_LEGACY_PLAINTEXT", "true");
    expect(verifyTwoFactorToken(secret, authenticator.generate(secret))).toBe(true);
  });

  it("preserves the authenticator code when the same secret is encrypted", () => {
    expect(verifyTwoFactorToken(encryptSecret(secret), authenticator.generate(secret))).toBe(true);
  });

  it.each(["missing", "wrong", "malformed", "tampered"])("reports %s encryption material without treating it as a wrong code", (kind) => {
    let stored = encryptSecret(secret);
    if (kind === "missing") vi.stubEnv("TOTP_ENCRYPTION_KEYS", "{}");
    if (kind === "wrong") vi.stubEnv("TOTP_ENCRYPTION_KEYS", JSON.stringify({ test: Buffer.alloc(32, 2).toString("base64") }));
    if (kind === "malformed") vi.stubEnv("TOTP_ENCRYPTION_KEYS", "not-json");
    if (kind === "tampered") stored = stored.slice(0, -2);
    expect(() => verifyTwoFactorToken(stored, authenticator.generate(secret))).toThrow("TOTP secret could not be read");
  });

  it("leaves backup-code handling available even when decryption is unavailable", () => {
    expect(verifyTwoFactorToken("enc:v1:missing:iv:tag:data", "ABCDE-12345")).toBe(false);
  });

  it("still rejects wrong and expired authenticator codes", () => {
    const stored = encryptSecret(secret);
    const code = authenticator.generate(secret);
    const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, "0");
    expect(verifyTwoFactorToken(stored, wrong)).toBe(false);
    const past = authenticator.clone({ epoch: Date.now() - 300_000 });
    expect(verifyTwoFactorToken(stored, past.generate(secret))).toBe(false);
  });
});
