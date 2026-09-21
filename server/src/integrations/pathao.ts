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
