// Pathao Courier Merchant API — see docs/ARCHITECTURE.md's "Courier &
// delivery" section. Needed env vars (see server/.env.example):
//   PATHAO_BASE_URL, PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET,
//   PATHAO_USERNAME, PATHAO_PASSWORD, PATHAO_STORE_ID
//
// UNLIKE bkash.ts, these endpoint paths/shapes have NOT been verified
// against a live Pathao sandbox response — bKash publishes a public sandbox
// app anyone can test against, but Pathao only issues sandbox credentials
// per-merchant on request. This is built from Pathao's documented Merchant
// API v1 shape (consistent across their own docs and multiple third-party
// SDKs), gated the same way bKash was before it existed, but treat the
// first real call as a test: if Pathao's actual response shape differs,
// only the parsing in this file needs to change, not any caller.
const ISSUE_TOKEN_PATH = "/aladdin/api/v1/issue-token";
const ORDERS_PATH = "/aladdin/api/v1/orders";
const CITY_LIST_PATH = "/aladdin/api/v1/city-list";

interface PathaoConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
}

function readConfig(): PathaoConfig | null {
  const baseUrl = process.env.PATHAO_BASE_URL;
  const clientId = process.env.PATHAO_CLIENT_ID;
  const clientSecret = process.env.PATHAO_CLIENT_SECRET;
  const username = process.env.PATHAO_USERNAME;
  const password = process.env.PATHAO_PASSWORD;
  const storeId = process.env.PATHAO_STORE_ID;
  if (!baseUrl || !clientId || !clientSecret || !username || !password || !storeId) return null;
  return { baseUrl, clientId, clientSecret, username, password, storeId };
}

export function isPathaoConfigured(): boolean {
  return readConfig() !== null;
}

// Same reasoning as bKash's cached grant token: re-authenticating on expiry
// is simpler than wiring up the separate refresh-token grant, and cheap
// enough at this store's traffic.
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(config: PathaoConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const res = await fetch(`${config.baseUrl}${ISSUE_TOKEN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
      grant_type: "password",
    }),
    // A live checkout delivery quote (see resolveDeliveryFee in
    // orderController.ts) needs this to fail fast and fall back to the flat
    // fee rather than stall the customer's checkout if Pathao is slow/down.
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!res.ok || !data.access_token) {
    cachedToken = null;
    throw new Error(data.message || `Pathao token request failed (${res.status})`);
  }

  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.accessToken;
}

async function authedRequest<T>(
  config: PathaoConfig,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const accessToken = await getAccessToken(config);
  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  return (await res.json()) as T;
}

// Pathao wraps every response as { type, code, message, data }.
interface PathaoEnvelope<T> {
  type?: string;
  code?: number;
  message?: string;
  data?: T;
}

export interface PathaoLocation {
  id: number;
  name: string;
}

export async function getPathaoCities(): Promise<PathaoLocation[]> {
  const config = readConfig();
  if (!config) throw new Error("Pathao isn't configured");
  const res = await authedRequest<PathaoEnvelope<{ data: { city_id: number; city_name: string }[] }>>(
    config,
    "GET",
    CITY_LIST_PATH
  );
  const cities = res.data?.data ?? [];
  return cities.map((c) => ({ id: c.city_id, name: c.city_name }));
}

export async function getPathaoZones(cityId: number): Promise<PathaoLocation[]> {
  const config = readConfig();
  if (!config) throw new Error("Pathao isn't configured");
  const res = await authedRequest<PathaoEnvelope<{ data: { zone_id: number; zone_name: string }[] }>>(
    config,
    "GET",
    `/aladdin/api/v1/cities/${cityId}/zone-list`
  );
  const zones = res.data?.data ?? [];
  return zones.map((z) => ({ id: z.zone_id, name: z.zone_name }));
}

export async function getPathaoAreas(zoneId: number): Promise<PathaoLocation[]> {
  const config = readConfig();
  if (!config) throw new Error("Pathao isn't configured");
  const res = await authedRequest<PathaoEnvelope<{ data: { area_id: number; area_name: string }[] }>>(
    config,
    "GET",
    `/aladdin/api/v1/zones/${zoneId}/area-list`
  );
  const areas = res.data?.data ?? [];
  return areas.map((a) => ({ id: a.area_id, name: a.area_name }));
}

// Cached separately from the admin booking panel's always-fresh
// getPathaoCities/getPathaoZones above — matchPathaoLocation (below) runs on
// every live checkout quote, and Pathao's own serviceable cities/zones
// change rarely, so refetching them per-checkout would just add latency and
// load for no real benefit.
const LOCATION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cachedCities: { cities: PathaoLocation[]; expiresAt: number } | null = null;
const cachedZonesByCity = new Map<number, { zones: PathaoLocation[]; expiresAt: number }>();

async function getCachedCities(): Promise<PathaoLocation[]> {
  if (cachedCities && cachedCities.expiresAt > Date.now()) return cachedCities.cities;
  const cities = await getPathaoCities();
  cachedCities = { cities, expiresAt: Date.now() + LOCATION_CACHE_TTL_MS };
  return cities;
}

async function getCachedZones(cityId: number): Promise<PathaoLocation[]> {
  const cached = cachedZonesByCity.get(cityId);
  if (cached && cached.expiresAt > Date.now()) return cached.zones;
  const zones = await getPathaoZones(cityId);
  cachedZonesByCity.set(cityId, { zones, expiresAt: Date.now() + LOCATION_CACHE_TTL_MS });
  return zones;
}

function normalizeLocationName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\bdistrict\b/g, "")
    .replace(/\bsadar\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export interface PathaoLocationMatch {
  cityId: number;
  zoneId: number;
}

// Best-effort name match from our free-text zila/upazila (see
// bangladeshGeo.ts on the frontend) to Pathao's own city/zone IDs — Pathao's
// APIs only accept its own location IDs, and there's no official mapping
// between the two datasets. This is deliberately more lenient than the admin
// booking flow (which always requires the admin to pick Pathao's own
// city/zone by hand, see bookPathaoOrder in orderController.ts): a live
// checkout quote can tolerate "best effort" because a bad or missing match
// just falls back to the flat per-product fee (see resolveDeliveryFee),
// never a broken checkout — whereas booking a real pickup needs certainty.
export async function matchPathaoLocation(
  zila: string,
  upazila: string
): Promise<PathaoLocationMatch | null> {
  const normZila = normalizeLocationName(zila);
  const normUpazila = normalizeLocationName(upazila);
  if (!normZila || !normUpazila) return null;

  const cities = await getCachedCities();
  const city = cities.find((c) => normalizeLocationName(c.name) === normZila);
  if (!city) return null;

  const zones = await getCachedZones(city.id);
  const zone =
    zones.find((z) => normalizeLocationName(z.name) === normUpazila) ??
    zones.find((z) => {
      const normZoneName = normalizeLocationName(z.name);
      return normZoneName.includes(normUpazila) || normUpazila.includes(normZoneName);
    });
  if (!zone) return null;

  return { cityId: city.id, zoneId: zone.id };
}

const PRICE_PLAN_PATH = "/aladdin/api/v1/merchant/price-plan";

export interface PathaoPriceQuote {
  price: number;
}

// Pathao's Price Calculator API — same "documented shape, not yet verified
// against a live sandbox response" caveat as the rest of this file (see the
// top-of-file comment). Callers (resolveDeliveryFee in orderController.ts)
// already treat any failure here as "fall back to the flat fee", so a shape
// mismatch degrades gracefully rather than breaking checkout — same as
// every other integration in this app gated by a `isXConfigured()` check.
export async function getPathaoPriceQuote(input: {
  cityId: number;
  zoneId: number;
  itemWeightKg: number;
}): Promise<PathaoPriceQuote> {
  const config = readConfig();
  if (!config) throw new Error("Pathao isn't configured");

  const res = await authedRequest<PathaoEnvelope<{ price?: number; final_price?: number }>>(
    config,
    "POST",
    PRICE_PLAN_PATH,
    {
      store_id: Number(config.storeId),
      item_type: 2, // "parcel" — same convention as createPathaoOrder
      delivery_type: 48, // "normal" delivery
      item_weight: input.itemWeightKg,
      recipient_city: input.cityId,
      recipient_zone: input.zoneId,
    }
  );

  const price = res.data?.final_price ?? res.data?.price;
  if (price == null) {
    throw new Error(res.message || "Pathao price quote failed");
  }
  return { price };
}

export interface CreatePathaoOrderInput {
  merchantOrderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCityId: number;
  recipientZoneId: number;
  recipientAreaId?: number;
  // kg — Pathao requires 0.5-10.
  itemWeightKg: number;
  itemQuantity: number;
  itemDescription?: string;
  specialInstruction?: string;
  // 0 for an already-paid order (bKash/online), full amount for Cash on
  // Delivery — this is what Pathao's rider collects from the customer.
  amountToCollect: number;
}

export interface PathaoOrderResult {
  consignmentId: string;
  orderStatus: string;
  deliveryFee?: number;
}

export async function createPathaoOrder(input: CreatePathaoOrderInput): Promise<PathaoOrderResult> {
  const config = readConfig();
  if (!config) throw new Error("Pathao isn't configured");

  const res = await authedRequest<
    PathaoEnvelope<{
      consignment_id?: string;
      order_status?: string;
      delivery_fee?: number;
    }>
  >(config, "POST", ORDERS_PATH, {
    store_id: Number(config.storeId),
    merchant_order_id: input.merchantOrderId,
    recipient_name: input.recipientName,
    recipient_phone: input.recipientPhone,
    recipient_address: input.recipientAddress,
    recipient_city: input.recipientCityId,
    recipient_zone: input.recipientZoneId,
    recipient_area: input.recipientAreaId,
    delivery_type: 48, // "normal" delivery — no same-day/on-demand option offered in the admin UI
    item_type: 2, // "parcel" (vs. 1 = document)
    item_quantity: input.itemQuantity,
    item_weight: input.itemWeightKg,
    item_description: input.itemDescription,
    special_instruction: input.specialInstruction,
    amount_to_collect: input.amountToCollect,
  });

  if (!res.data?.consignment_id) {
    throw new Error(res.message || "Pathao order creation failed");
  }
  return {
    consignmentId: res.data.consignment_id,
    orderStatus: res.data.order_status ?? "Pending",
    deliveryFee: res.data.delivery_fee,
  };
}

export async function getPathaoOrderStatus(consignmentId: string): Promise<{ orderStatus: string }> {
  const config = readConfig();
  if (!config) throw new Error("Pathao isn't configured");

  const res = await authedRequest<PathaoEnvelope<{ order_status?: string }>>(
    config,
    "GET",
    `${ORDERS_PATH}/${consignmentId}/info`
  );
  if (!res.data?.order_status) {
    throw new Error(res.message || "Pathao status lookup failed");
  }
  return { orderStatus: res.data.order_status };
}
