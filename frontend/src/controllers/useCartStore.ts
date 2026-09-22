import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppliedPromo, CartItem } from "@/models";
import { pushToDataLayer } from "@/lib/gtm";

interface CartState {
  items: CartItem[];
  promo: AppliedPromo | null;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
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
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
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
            items: [{ item_id: item.productId, item_name: item.name, price: item.price, quantity }],
          },
        });
      },
      removeItem: (productId) => {
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
      },
      setQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
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

        // scope === "product" — only discounts that one line item, and only
        // if it's actually in the cart (e.g. a code shared for one product
        // applied while browsing, then something else added instead).
        const item = items.find((i) => i.productId === promo.productId);
        if (!item) return 0;
        const lineTotal = item.quantity * item.price;
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
