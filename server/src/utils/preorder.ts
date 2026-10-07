import type { PaymentMethod } from "../models/Order";
import { MAX_PREORDER_DISCOUNT_PERCENT, type IProductPreorder } from "../models/Product";

// The admin-editable part of Product.preorder — everything except
// `reserved`, which only orders move.
export interface NormalizedPreorder {
  enabled: boolean;
  shipDate?: Date;
  limit?: number;
  codDiscountPercent: number;
  onlineDiscountPercent: number;
}

function badRequest(message: string): never {
  throw { status: 400, message };
}

function isBlank(value: unknown) {
  return value === undefined || value === null || value === "";
}

function percent(value: unknown, what: string): number {
  if (isBlank(value)) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > MAX_PREORDER_DISCOUNT_PERCENT) {
    badRequest(`${what} must be between 0 and ${MAX_PREORDER_DISCOUNT_PERCENT}%`);
  }
  return n;
}

// Validates the admin form's pre-order settings. Multipart form fields
// always arrive as strings, so it comes JSON-encoded; a plain JSON body
// could send a real object. Throws { status: 400, message } on anything
// malformed, same convention as normalizeVariantInput.
export function normalizePreorderInput(raw: unknown): NormalizedPreorder {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      badRequest("Pre-order settings are not valid JSON");
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    badRequest("Pre-order settings are malformed");
  }
  const input = value as Record<string, unknown>;

  const result: NormalizedPreorder = {
    enabled: input.enabled === true || input.enabled === "true",
    codDiscountPercent: percent(input.codDiscountPercent, "Cash on Delivery pre-order discount"),
    onlineDiscountPercent: percent(input.onlineDiscountPercent, "Online payment pre-order discount"),
  };

  if (!isBlank(input.shipDate)) {
    if (typeof input.shipDate !== "string") badRequest("Ship date must be a date");
    const date = new Date(input.shipDate);
    if (Number.isNaN(date.getTime())) badRequest("Ship date isn't a valid date");
    result.shipDate = date;
  }

  if (!isBlank(input.limit)) {
    const n = typeof input.limit === "string" ? Number(input.limit) : input.limit;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1) {
      badRequest("Pre-order limit must be a whole number of at least 1 (or left empty for no limit)");
    }
    result.limit = n;
  }

  return result;
}

// The update for saving `next` over a product whose pre-order is currently
// `wasEnabled` — dotted paths, so `reserved` is never touched by the form.
// Switching pre-order on (from off) starts a new batch, so the count of
// units already promised starts again from 0.
export function preorderUpdate(next: NormalizedPreorder, wasEnabled: boolean) {
  const $set: Record<string, unknown> = {
    "preorder.enabled": next.enabled,
    "preorder.codDiscountPercent": next.codDiscountPercent,
    "preorder.onlineDiscountPercent": next.onlineDiscountPercent,
  };
  const $unset: Record<string, ""> = {};
  if (next.shipDate) $set["preorder.shipDate"] = next.shipDate;
  else $unset["preorder.shipDate"] = "";
  if (next.limit !== undefined) $set["preorder.limit"] = next.limit;
  else $unset["preorder.limit"] = "";
  if (next.enabled && !wasEnabled) $set["preorder.reserved"] = 0;
  return { $set, $unset };
}

// The pre-order discount percent for paying this way — Cash on Delivery
// gets the COD rate, anything paid online up front (bKash) the online one.
export function preorderDiscountPercent(
  preorder: Pick<IProductPreorder, "codDiscountPercent" | "onlineDiscountPercent">,
  method: PaymentMethod
): number {
  return method === "cod" ? preorder.codDiscountPercent : preorder.onlineDiscountPercent;
}

// Units still open on a capped pre-order (Infinity when there's no cap).
export function preorderSpotsLeft(preorder: Pick<IProductPreorder, "limit" | "reserved">): number {
  return preorder.limit === undefined || preorder.limit === null
    ? Infinity
    : Math.max(0, preorder.limit - (preorder.reserved ?? 0));
}
