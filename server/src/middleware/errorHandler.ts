import { Request, Response, NextFunction } from "express";
import { reportError } from "../utils/errorMonitoring";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// The last-resort catch-all — Express 5 automatically forwards a rejected
// promise or thrown error from any async route handler here instead of
// crashing the process, so this is what actually keeps one bad request from
// taking the whole server down. Every genuinely-unexpected error (a status
// code wasn't set on purpose by a controller) is worth reporting, not just
// logging — see docs/ARCHITECTURE.md's "Reliability & error monitoring".
export const errorHandler = (
  err: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  reportError(err, { method: req.method, url: req.originalUrl });
  res.status(err.status ?? 500).json({ message: err.message || "Internal server error" });
};
