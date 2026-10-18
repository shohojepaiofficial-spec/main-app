import { createHash, timingSafeEqual } from "node:crypto";
import { Request, Response, NextFunction } from "express";

// Paths (under /api) that something other than the storefront calls directly:
// the host's health check, the browser redirect back from bKash and
// Pathao's courier status webhook (signed, see pathaoWebhookController).
const openPaths = new Set(["/health", "/orders/bkash/callback", "/orders/pathao/webhook"]);
const digest = (value: string) => createHash("sha256").update(value).digest();

// In production the API only answers the storefront: its Next.js proxy and
// server-side rendering send the shared INTERNAL_API_SECRET. Mounted before
// the rate limiter so direct hits are refused without touching the database.
export const storefrontOnly = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "production" || openPaths.has(req.path)) return next();
  const expected = process.env.INTERNAL_API_SECRET, sent = req.get("X-Internal-Secret");
  if (!expected || !sent || !timingSafeEqual(digest(sent), digest(expected))) return res.status(403).json({ message: "Forbidden" });
  next();
};
