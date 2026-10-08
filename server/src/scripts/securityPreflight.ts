import "dotenv/config";
import { encryptSecret, decryptSecret } from "../utils/secretEncryption";

// Read-only configuration checks. Never prints variable values or connects
// to a production database; provider settings still require operator evidence.
const checks: Record<string, boolean> = {
  productionMode: process.env.NODE_ENV === "production",
  databaseConfigured: !!process.env.MONGODB_URI,
  jwtSecretConfigured: (process.env.JWT_SECRET?.length ?? 0) >= 32,
  internalSecretConfigured: (process.env.INTERNAL_API_SECRET?.length ?? 0) >= 32,
  publicApiHttps: process.env.SERVER_PUBLIC_URL?.startsWith("https://") ?? false,
  frontendHttps: process.env.CLIENT_URL?.startsWith("https://") ?? false,
  legacyTotpDisabled: process.env.TOTP_ALLOW_LEGACY_PLAINTEXT !== "true",
};
try { checks.totpEncryptionRoundTrip = decryptSecret(encryptSecret("preflight")) === "preflight"; }
catch { checks.totpEncryptionRoundTrip = false; }
console.log(JSON.stringify({ checks, unverified: ["database least privilege and network access", "edge/origin routing", "provider MFA", "isolated backup restore", "alert delivery"] }, null, 2));
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
