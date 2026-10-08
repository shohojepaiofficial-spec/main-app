import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyring() {
  const keys = JSON.parse(process.env.TOTP_ENCRYPTION_KEYS || "{}") as Record<string, string>;
  return keys;
}
function keyFor(id: string) {
  const encoded = keyring()[id];
  const key = Buffer.from(encoded || "", "base64");
  if (!/^[\w-]+$/.test(id) || key.length !== 32) throw new Error("TOTP encryption key unavailable");
  return key;
}
export function encryptSecret(secret: string) {
  const id = process.env.TOTP_ENCRYPTION_KEY_ID || "";
  const key = keyFor(id);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`totp:v1:${id}`));
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["enc", "v1", id, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(":");
}
export function decryptSecret(value: string) {
  // Legacy plaintext is readable during the explicit backfill rollout only.
  if (!value.startsWith("enc:")) {
    if (process.env.TOTP_ALLOW_LEGACY_PLAINTEXT === "true" || process.env.NODE_ENV === "test") return value;
    throw new Error("Legacy TOTP secret needs migration");
  }
  const [prefix, version, id, iv, tag, data, extra] = value.split(":");
  if (prefix !== "enc" || version !== "v1" || !id || !iv || !tag || !data || extra) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", keyFor(id), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(`totp:v1:${id}`));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
