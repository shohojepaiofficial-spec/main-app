import { format } from "date-fns";
import type { CartItem, CartPreorder, PaymentMethod, Product } from "@/models";

// Pure helpers for pre-orders, shared by the product page, cart, checkout
// and order views. The server (utils/preorder.ts + orderController's
// computeOrderTotals) is what actually enforces the cap and charges the
// discount — this only previews the same rules.

export function isOnPreorder(product: Pick<Product, "preorder">): boolean {
  return !!product.preorder?.enabled;
}

// Units still open on a capped pre-order; Infinity when there's no cap.
export function preorderSpotsLeft(product: Pick<Product, "preorder">): number {
  const preorder = product.preorder;
  if (!preorder?.enabled) return 0;
  if (preorder.limit === undefined || preorder.limit === null) return Infinity;
  return Math.max(0, preorder.limit - (preorder.reserved ?? 0));
}

// What a cart line keeps about the pre-order — undefined for a product
// that isn't on pre-order.
export function toCartPreorder(product: Pick<Product, "preorder">): CartPreorder | undefined {
  if (!product.preorder?.enabled) return undefined;
  return {
    shipDate: product.preorder.shipDate,
    codDiscountPercent: product.preorder.codDiscountPercent,
    onlineDiscountPercent: product.preorder.onlineDiscountPercent,
  };
}

export function preorderDiscountPercent(preorder: CartPreorder, method: PaymentMethod): number {
  return method === "cod" ? preorder.codDiscountPercent : preorder.onlineDiscountPercent;
}

// The pre-order discount for this cart paid this way — whole taka, rounded
// once over the cart, exactly like the server.
export function calculatePreorderDiscount(items: CartItem[], method: PaymentMethod): number {
  const raw = items.reduce(
    (sum, i) => (i.preorder ? sum + i.price * i.quantity * (preorderDiscountPercent(i.preorder, method) / 100) : sum),
    0
  );
  return Math.round(raw);
}

// Latest ship date among the cart's pre-order lines — the parcel waits for
// the last one. Undefined when none has a date.
export function latestShipDate(items: Pick<CartItem, "preorder">[]): string | undefined {
  return items
    .map((i) => i.preorder?.shipDate)
    .filter((d): d is string => !!d)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .pop();
}

// "15 Nov 2026"
export function formatShipDate(date: string): string {
  return format(new Date(date), "d MMM yyyy");
}

// The biggest pre-order discount any line in the cart offers for each way
// of paying — for the "pay online and save more" hint at checkout.
export function bestPreorderPercents(items: Pick<CartItem, "preorder">[]): { cod: number; online: number } {
  return items.reduce(
    (best, i) =>
      i.preorder
        ? {
            cod: Math.max(best.cod, i.preorder.codDiscountPercent),
            online: Math.max(best.online, i.preorder.onlineDiscountPercent),
          }
        : best,
    { cod: 0, online: 0 }
  );
}
