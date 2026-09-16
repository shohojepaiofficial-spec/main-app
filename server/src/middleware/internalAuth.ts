import { Request, Response, NextFunction } from "express";

export const requireInternalSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers["x-internal-secret"];

  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};
