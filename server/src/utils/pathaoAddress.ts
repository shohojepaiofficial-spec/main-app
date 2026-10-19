import { z } from "zod";
import type { IPathaoAddress } from "../models/PathaoAddress";
import {
  getCachedPathaoAreas,
  getCachedPathaoCities,
  getCachedPathaoZones,
  isPathaoConfigured,
} from "../integrations/pathao";

// What a checkout sends when the customer picked from Pathao's lists: ids
// only — the names are always taken from Pathao's own lists, never from
// the browser.
export const pathaoRefSchema = z
  .object({
    cityId: z.number().int().positive().max(1_000_000),
    zoneId: z.number().int().positive().max(1_000_000),
    areaId: z.number().int().positive().max(10_000_000).optional(),
  })
  .strict();
export type PathaoRef = z.infer<typeof pathaoRefSchema>;

// Checks the ids against Pathao's (cached) lists and fills in Pathao's
// names. Null when they don't fit together or Pathao can't be reached —
// the order then just keeps zila/upazila, like an address picked from our
// own list, and staff pick the Pathao location at booking.
export async function verifyPathaoRef(ref: PathaoRef | undefined): Promise<IPathaoAddress | null> {
  if (!ref || !isPathaoConfigured()) return null;
  try {
    const city = (await getCachedPathaoCities()).find((c) => c.id === ref.cityId);
    if (!city) return null;
    const zone = (await getCachedPathaoZones(city.id)).find((z) => z.id === ref.zoneId);
    if (!zone) return null;
    let area: { id: number; name: string } | undefined;
    if (ref.areaId) {
      area = (await getCachedPathaoAreas(zone.id)).find((a) => a.id === ref.areaId);
      if (!area) return null;
    }
    return {
      cityId: city.id,
      cityName: city.name,
      zoneId: zone.id,
      zoneName: zone.name,
      ...(area ? { areaId: area.id, areaName: area.name } : {}),
    };
  } catch {
    return null;
  }
}
