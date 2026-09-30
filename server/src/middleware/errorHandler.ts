import { Request, Response, NextFunction } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { reportError } from "../utils/errorMonitoring";
import { MAX_UPLOAD_FILES, MAX_UPLOAD_MB } from "../utils/upload";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// Multer's own limit errors carry no HTTP status, so without this they'd
// surface as a 500 "server error" (and page Sentry) when really the upload
// was just too big — turn them into a clear message the form can show.
function fromMulterError(err: multer.MulterError): { status: number; message: string } {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return { status: 413, message: `Each image must be ${MAX_UPLOAD_MB}MB or smaller.` };
    case "LIMIT_FILE_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return { status: 400, message: `You can upload up to ${MAX_UPLOAD_FILES} images at a time.` };
    default:
      return { status: 400, message: "That upload couldn't be processed — please try a different image." };
  }
}

// The last-resort catch-all — Express 5 automatically forwards a rejected
// promise or thrown error from any async route handler here instead of
// crashing the process, so this is what actually keeps one bad request from
// taking the whole server down. Every genuinely-unexpected error (a 5xx —
// not a request the client simply got wrong) is worth reporting, not just
// logging — see docs/ARCHITECTURE.md's "Reliability & error monitoring".
export const errorHandler = (
  err: Error & { status?: number },
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // A schema validator (min/max/required) rejecting the admin's input is a
  // bad request, not a server fault — show its message instead of a 500.
  const { status, message } =
    err instanceof multer.MulterError
      ? fromMulterError(err)
      : err instanceof mongoose.Error.ValidationError
        ? { status: 400, message: Object.values(err.errors)[0]?.message ?? err.message }
        : { status: err.status ?? 500, message: err.message || "Internal server error" };

  if (status >= 500) reportError(err, { method: req.method, url: req.originalUrl });
  res.status(status).json({ message });
};
