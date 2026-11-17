import { Request, Response } from "express";
import { getRailwayUsage, isRailwayConfigured } from "../integrations/railway";

// Remaining Railway credit for the admin dashboard. `configured: false`
// (not an error) when RAILWAY_API_TOKEN isn't set, so the tile can say so.
export const getUsage = async (_req: Request, res: Response) => {
  if (!isRailwayConfigured()) {
    res.json({ configured: false, usage: null });
    return;
  }
  try {
    res.json({ configured: true, usage: await getRailwayUsage() });
  } catch (err) {
    console.error("Railway usage check failed:", (err as Error).message);
    res.status(502).json({ message: "Could not get usage from Railway" });
  }
};
