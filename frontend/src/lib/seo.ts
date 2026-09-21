export const SITE_NAME = "Shohoje Pai";
export const SITE_DESCRIPTION =
  "Shop quality products online — new arrivals, seasonal sales, and fast shipping.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// The store's home city (what "inside city" delivery fees/locations are
// relative to) used to be hardcoded here too, duplicating server's
// utils/store.ts#STORE_CITY. Now fetched from GET /api/config instead — see
// services/configService.ts#getStoreCity.
