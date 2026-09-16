import { STORE_CITY } from "@/lib/seo";
import { CartItem } from "@/models";

// Whether a zila counts as "inside" the store's home city for delivery-fee
// purposes — derived from the selected Zila, not a separate manual choice.
// Mirrors server/src/utils/store.ts's STORE_CITY comparison exactly (both
// must agree, since the server recomputes this authoritatively at checkout).
export const isInsideStoreCity = (zila: string) => zila === STORE_CITY;

// One flat fee per distinct product line, not per unit or per order — each
// product carries its own delivery fee (shown on its own product page), so
// a cart with three different products pays three delivery fees.
export const calculateDeliveryTotal = (items: CartItem[], zila: string | undefined): number => {
  if (!zila) return 0;
  const inside = isInsideStoreCity(zila);
  return items.reduce(
    (sum, item) => sum + (inside ? item.deliveryFeeInsideCity : item.deliveryFeeOutsideCity),
    0
  );
};
