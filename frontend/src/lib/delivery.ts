import { CartItem } from "@/models";

// Whether a zila counts as "inside" the store's home city for delivery-fee
// purposes — derived from the selected Zila, not a separate manual choice.
// Mirrors server/src/utils/store.ts's STORE_CITY comparison exactly (both
// must agree, since the server recomputes this authoritatively at checkout).
// `storeCity` is passed in (fetched from GET /api/config — see
// services/configService.ts) rather than imported as a constant, so this
// file isn't a second hardcoded copy of it.
export const isInsideStoreCity = (zila: string, storeCity: string) => zila === storeCity;

// One flat fee per distinct product, not per unit, line or order — each
// product carries its own delivery fee (shown on its own product page), so
// a cart with three different products pays three delivery fees, but two
// sizes of the same hoodie (two cart lines, one product) pay one. Must match
// server/src/controllers/orderController.ts's computeOrderTotals.
export const calculateDeliveryTotal = (
  items: CartItem[],
  zila: string | undefined,
  storeCity: string
): number => {
  if (!zila) return 0;
  const inside = isInsideStoreCity(zila, storeCity);
  const seen = new Set<string>();
  let total = 0;
  for (const item of items) {
    if (seen.has(item.productId)) continue;
    seen.add(item.productId);
    total += inside ? item.deliveryFeeInsideCity : item.deliveryFeeOutsideCity;
  }
  return total;
};
