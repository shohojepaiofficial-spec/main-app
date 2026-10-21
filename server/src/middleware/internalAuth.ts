import { createHash, timingSafeEqual } from "node:crypto";
import { Request, Response, NextFunction } from "express";

const digest = (value: string) => createHash("sha256").update(value).digest();

// True when the request carries the storefront's INTERNAL_API_SECRET.
// Compared in constant time, so response timing can't reveal the secret a
// character at a time (SEC-24).
export function hasInternalSecret(req: Request) {
  const expected = process.env.INTERNAL_API_SECRET;
  const sent = req.get("X-Internal-Secret");
  return Boolean(expected) && typeof sent === "string" && timingSafeEqual(digest(sent), digest(expected!));
}

// Server-to-server calls from the storefront (Google sign-in's oauth-sync).
export const requireInternalSecret = (req: Request, res: Response, next: NextFunction) => {
  if (!hasInternalSecret(req)) return res.status(403).json({ message: "Forbidden" });
  next();
};
