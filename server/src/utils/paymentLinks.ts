import crypto from "node:crypto";

// Payment links (/pay/<link>) are public and need no account, so the link
// itself is the only thing keeping a stranger out (SEC-21). A bare database
// id is partly predictable (time + per-process counter), so each link is the
// cart id plus an HMAC of it: unguessable without the server secret, and the
// bKash callback can rebuild it from the order's sharedCartId without storing
// anything. Same idea as the unsubscribe links (utils/campaignTokens.ts); the
// "payment-link:" prefix keeps the two signatures from ever matching.
const SIGNATURE_LENGTH = 32; // base64url characters = 192 bits

function sign(cartId: string): string {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET as string)
    .update(`payment-link:${cartId.toLowerCase()}`)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

export function paymentLink(cartId: string): string {
  return `${cartId.toLowerCase()}-${sign(cartId)}`;
}

// The cart id inside a valid link, or null for anything else (a bare id
// from before SEC-21, a typo, a forged signature).
export function cartIdFromPaymentLink(link: unknown): string | null {
  if (typeof link !== "string") return null;
  const match = /^([a-f\d]{24})-([A-Za-z0-9_-]+)$/i.exec(link);
  if (!match) return null;
  const expected = Buffer.from(sign(match[1]));
  const sent = Buffer.from(match[2]);
  return expected.length === sent.length && crypto.timingSafeEqual(expected, sent) ? match[1].toLowerCase() : null;
}
