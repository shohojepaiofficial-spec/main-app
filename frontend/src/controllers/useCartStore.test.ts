import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./useCartStore";
import type { CartItem } from "@/models";

// The cart's promo preview must match what the server charges
// (computeOrderTotals rounds the promo discount to whole taka).
const line = (overrides: Partial<CartItem> = {}): CartItem => ({ productId: "p1", name: "Towel", price: 107, quantity: 1, deliveryFeeInsideCity: 0, deliveryFeeOutsideCity: 0, ...overrides });

beforeEach(() => useCartStore.setState({ items: [], promo: null }));

describe("cart promo preview", () => {
  it("rounds a sitewide percentage discount to whole taka", () => {
    useCartStore.setState({ items: [line()], promo: { code: "SAVE18", discountType: "percentage", value: 18, scope: "all" } });
    expect(useCartStore.getState().discountAmount()).toBe(19); // 19.26
    expect(useCartStore.getState().grandTotal()).toBe(88);
  });

  it("rounds a product-only percentage discount the same way", () => {
    useCartStore.setState({
      items: [line(), line({ productId: "p2", price: 500 })],
      promo: { code: "TOWEL", discountType: "percentage", value: 12.5, scope: "product", productId: "p1" },
    });
    expect(useCartStore.getState().discountAmount()).toBe(13); // 13.375
  });

  it("caps a flat discount at the items total", () => {
    useCartStore.setState({ items: [line({ price: 30 })], promo: { code: "TAKA50", discountType: "flat", value: 50, scope: "all" } });
    expect(useCartStore.getState().discountAmount()).toBe(30);
  });
});
