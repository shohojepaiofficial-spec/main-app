import { createHash, timingSafeEqual } from "node:crypto";
import { Request, Response, NextFunction } from "express";

const digest = (value: string) => createHash("sha256").update(value).digest();

// Server-to-server calls from the storefront (Google sign-in's oauth-sync).
// Compared in constant time, like storefrontOnly, so response timing can't
// reveal the secret a character at a time (SEC-24).
export const requireInternalSecret = (req: Request, res: Response, next: NextFunction) => {
  const expected = process.env.INTERNAL_API_SECRET;
  const sent = req.headers["x-internal-secret"];

  if (!expected || typeof sent !== "string" || !timingSafeEqual(digest(sent), digest(expected))) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};
