import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppliedPromo, CartItem, OrderLineInput } from "@/models";
import { pushToDataLayer } from "@/lib/gtm";

// A cart line is one product *and* one variant — "Hoodie, Black / L" and
// "Hoodie, Grey / M" are two lines, each with its own quantity. Every
// per-line action (remove, set quantity) is keyed by this.
export function cartLineKey(item: Pick<CartItem, "productId" | "variantId">): string {
  return item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
}

// What checkout, delivery quotes and shared carts send the server for the
// cart — ids and quantities only.
export function toOrderLineInputs(items: CartItem[]): OrderLineInput[] {
  return items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }));
}

interface CartState {
  items: CartItem[];
  promo: AppliedPromo | null;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (lineKey: string) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  clear: () => void;
  applyPromo: (promo: AppliedPromo) => void;
  clearPromo: () => void;
  totalItems: () => number;
  /** Pre-discount total. */
  totalPrice: () => number;
  /** How much the applied promo actually takes off, given what's in the cart right now. */
  discountAmount: () => number;
  /** Post-discount total — what the customer actually pays. */
  grandTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promo: null,
      addItem: (item, quantity = 1) => {
        set((state) => {
          const key = cartLineKey(item);
          const existing = state.items.find((i) => cartLineKey(i) === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                cartLineKey(i) === key
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
        // One choke point for every "add to cart" path (product page,
        // wishlist "move to cart", shared-cart pay flow, etc.) rather than
        // hunting down each call site individually.
        pushToDataLayer({
          event: "add_to_cart",
          ecommerce: {
            currency: "BDT",
            value: item.price * quantity,
            items: [
              {
                item_id: item.productId,
                item_name: item.name,
                ...(item.variantLabel ? { item_variant: item.variantLabel } : {}),
                price: item.price,
                quantity,
              },
            ],
          },
        });
      },
      removeItem: (lineKey) => {
        set((state) => ({ items: state.items.filter((i) => cartLineKey(i) !== lineKey) }));
      },
      setQuantity: (lineKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineKey);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (cartLineKey(i) === lineKey ? { ...i, quantity } : i)),
        }));
      },
      clear: () => set({ items: [], promo: null }),
      applyPromo: (promo) => set({ promo }),
      clearPromo: () => set({ promo: null }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.quantity * i.price, 0),
      discountAmount: () => {
        const { items, promo } = get();
        if (!promo) return 0;

        if (promo.scope === "all") {
          const subtotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
          if (subtotal === 0) return 0;
          return promo.discountType === "percentage"
            ? subtotal * (promo.value / 100)
            : Math.min(promo.value, subtotal);
        }

        // scope === "product" — only discounts that product's lines (every
        // variant of it — two sizes of one hoodie both count), and only if
        // it's actually in the cart (e.g. a code shared for one product
        // applied while browsing, then something else added instead). Same
        // rule as the server's computeOrderTotals.
        const lines = items.filter((i) => i.productId === promo.productId);
        if (lines.length === 0) return 0;
        const lineTotal = lines.reduce((sum, i) => sum + i.quantity * i.price, 0);
        return promo.discountType === "percentage"
          ? lineTotal * (promo.value / 100)
          : Math.min(promo.value, lineTotal);
      },
      grandTotal: () => {
        const subtotal = get().totalPrice();
        const discount = get().discountAmount();
        return Math.max(0, subtotal - discount);
      },
    }),
    {
      name: "cart-storage",
      // Zustand's persist middleware otherwise reads localStorage
      // synchronously the moment this module evaluates in the browser — so
      // a returning visitor's very first client render already has cart
      // items, while the server (which has no localStorage) always rendered
      // an empty cart. That mismatch is exactly what broke the navbar's
      // cart-count badge. Skipping auto-hydration keeps the first client
      // render in agreement with the server (both start empty); Providers
      // then calls `useCartStore.persist.rehydrate()` once, post-mount, the
      // same "hydrate after mount" pattern already used for useAuthStore.
      skipHydration: true,
    }
  )
);
