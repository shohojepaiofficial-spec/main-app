import { Request, Response, NextFunction } from "express";
import { hasInternalSecret } from "./internalAuth";

// Paths (under /api) that something other than the storefront calls directly:
// the browser redirect back from bKash and Pathao's courier status webhook
// (signed, see pathaoWebhookController). The host's /api/health check is
// answered in app.ts before this middleware runs.
const openPaths = new Set(["/orders/bkash/callback", "/orders/pathao/webhook"]);

// In production the API only answers the storefront: its Next.js proxy and
// server-side rendering send the shared INTERNAL_API_SECRET. Mounted before
// the rate limiter so direct hits are refused without touching the database.
export const storefrontOnly = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "production" || openPaths.has(req.path)) return next();
  if (!hasInternalSecret(req)) return res.status(403).json({ message: "Forbidden" });
  next();
};
