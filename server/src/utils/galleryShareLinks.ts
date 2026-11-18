import crypto from "node:crypto";

// Gallery share pages (/gallery/<link>) are public and need no account, so
// the link itself is the only thing keeping a stranger out — same idea as
// payment links (utils/paymentLinks.ts). The "gallery-share:" prefix keeps
// this signature from ever matching a payment link's.
const SIGNATURE_LENGTH = 32; // base64url characters = 192 bits

function sign(shareId: string): string {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET as string)
    .update(`gallery-share:${shareId.toLowerCase()}`)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

export function galleryShareLink(shareId: string): string {
  return `${shareId.toLowerCase()}-${sign(shareId)}`;
}

// The share id inside a valid link, or null for anything else (a typo, a
// forged signature).
export function shareIdFromGalleryShareLink(link: unknown): string | null {
  if (typeof link !== "string") return null;
  const match = /^([a-f\d]{24})-([A-Za-z0-9_-]+)$/i.exec(link);
  if (!match) return null;
  const expected = Buffer.from(sign(match[1]));
  const sent = Buffer.from(match[2]);
  return expected.length === sent.length && crypto.timingSafeEqual(expected, sent) ? match[1].toLowerCase() : null;
}
