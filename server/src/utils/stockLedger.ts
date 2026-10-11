import { ClientSession, Types } from "mongoose";
import { StockMovement, StockMovementReason } from "../models/StockMovement";
import { variantLabel } from "./productVariants";
import type { IVariantSelection } from "../models/Product";

type Id = Types.ObjectId | string;

export interface StockMovementInput {
  product: Id;
  variant?: Id;
  variantLabel?: string;
  change: number;
  reason: StockMovementReason;
  order?: Id;
  returnRequest?: Id;
  actor?: Id;
}

// Writes ledger lines inside the caller's transaction. Zero changes are
// dropped, so callers can pass a diff straight through.
export async function recordStockMovements(movements: StockMovementInput[], session: ClientSession) {
  const rows = movements.filter((m) => m.change !== 0);
  if (rows.length > 0) await StockMovement.insertMany(rows, { session });
}

interface OrderLineLike {
  product: Id;
  quantity: number;
  variant?: Id;
  variantLabel?: string;
  isPreorder?: boolean;
}

// One line per stock-moving order item: negative for a sale, positive for a
// cancellation or return. Pre-order lines took no stock and are skipped.
export function orderStockMovements(
  items: OrderLineLike[],
  reason: "sale" | "cancellation" | "return",
  refs: { order?: Id; returnRequest?: Id },
  includePreorder = false,
): StockMovementInput[] {
  return items
    .filter((item) => includePreorder || !item.isPreorder)
    .map((item) => ({
      product: item.product,
      variant: item.variant,
      variantLabel: item.variantLabel,
      change: reason === "sale" ? -item.quantity : item.quantity,
      reason,
      ...refs,
    }));
}

interface StockSnapshot {
  stock: number;
  variants?: { _id: Id; selections: IVariantSelection[]; stock: number }[];
}

// What a staff create/edit did to stock, per variant (or per product when it
// has no variants). A new variant counts from 0; a deleted one goes to 0.
export function stockAdjustments(
  productId: Id,
  before: StockSnapshot | null,
  after: StockSnapshot,
  actor: Id,
): StockMovementInput[] {
  const levels = (snapshot: StockSnapshot | null) => {
    const map = new Map<string, { variant?: Id; label?: string; stock: number }>();
    if (!snapshot) return map;
    if (snapshot.variants && snapshot.variants.length > 0) {
      for (const v of snapshot.variants) {
        map.set(String(v._id), { variant: v._id, label: variantLabel(v.selections), stock: v.stock });
      }
    } else {
      map.set("", { stock: snapshot.stock });
    }
    return map;
  };
  const old = levels(before);
  const next = levels(after);
  const keys = new Set([...old.keys(), ...next.keys()]);
  return [...keys].map((key) => {
    const entry = next.get(key) ?? old.get(key)!;
    return {
      product: productId,
      variant: entry.variant,
      variantLabel: entry.label,
      change: (next.get(key)?.stock ?? 0) - (old.get(key)?.stock ?? 0),
      reason: "adjustment" as const,
      actor,
    };
  }).filter((m) => m.change !== 0);
}
