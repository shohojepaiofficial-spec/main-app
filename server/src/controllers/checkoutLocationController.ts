import { validateControllerInput } from "../middleware/controllerInput";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import {
  getCachedPathaoAreas,
  getCachedPathaoCities,
  getCachedPathaoZones,
  isPathaoConfigured,
  PathaoLocation,
} from "../integrations/pathao";

// Pathao's city → zone → area lists for the checkout address picker, from
// the server's 6-hour cache (integrations/pathao.ts). Anything short of a
// real, non-empty list answers 503 PATHAO_UNAVAILABLE, and checkout falls
// back to our own Zila/Upazila list — so Pathao being down never blocks an
// order.
const unavailable = (res: Response) =>
  res.status(503).json({ code: "PATHAO_UNAVAILABLE", message: "Pathao's area list isn't available right now" });

const byName = (a: PathaoLocation, b: PathaoLocation) => a.name.localeCompare(b.name);

async function sendList(res: Response, load: () => Promise<PathaoLocation[]>) {
  if (!isPathaoConfigured()) return unavailable(res);
  try {
    const items = await load();
    if (items.length === 0) return unavailable(res);
    res.json([...items].sort(byName));
  } catch (err) {
    console.error("Checkout Pathao list failed:", (err as Error).message);
    return unavailable(res);
  }
}

const positiveId = (value: unknown) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 10_000_000 ? id : null;
};

export const listCheckoutCities = async (req: AuthRequest, res: Response) => {
  validateControllerInput("listCheckoutCities", req);
  return sendList(res, getCachedPathaoCities);
};

export const listCheckoutZones = async (req: AuthRequest, res: Response) => {
  validateControllerInput("listCheckoutZones", req);
  const cityId = positiveId(req.params.cityId);
  if (!cityId) return res.status(400).json({ message: "Invalid city" });
  return sendList(res, () => getCachedPathaoZones(cityId));
};

export const listCheckoutAreas = async (req: AuthRequest, res: Response) => {
  validateControllerInput("listCheckoutAreas", req);
  const zoneId = positiveId(req.params.zoneId);
  if (!zoneId) return res.status(400).json({ message: "Invalid zone" });
  return sendList(res, () => getCachedPathaoAreas(zoneId));
};
