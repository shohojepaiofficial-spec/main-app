import { describe, it, expect } from "vitest";
import { isInsideStoreCity, calculateDeliveryTotal } from "./delivery";
import { CartItem } from "@/models";

const STORE_CITY = "Sylhet";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    name: "Towel",
    price: 200,
    quantity: 1,
    deliveryFeeInsideCity: 10,
    deliveryFeeOutsideCity: 100,
    ...overrides,
  };
}

describe("isInsideStoreCity", () => {
  it("matches the store's own city", () => {
    expect(isInsideStoreCity("Sylhet", STORE_CITY)).toBe(true);
  });

  it("doesn't match any other city", () => {
    expect(isInsideStoreCity("Dhaka", STORE_CITY)).toBe(false);
  });
});

describe("calculateDeliveryTotal", () => {
  it("returns 0 when no zila is selected yet", () => {
    expect(calculateDeliveryTotal([item()], undefined, STORE_CITY)).toBe(0);
  });

  it("sums the inside-city fee once per distinct line, not per unit", () => {
    const items = [item({ productId: "p1", quantity: 5, deliveryFeeInsideCity: 10 })];
    expect(calculateDeliveryTotal(items, "Sylhet", STORE_CITY)).toBe(10);
  });

  it("sums a flat fee across multiple distinct product lines", () => {
    const items = [
      item({ productId: "p1", deliveryFeeInsideCity: 10 }),
      item({ productId: "p2", deliveryFeeInsideCity: 20 }),
    ];
    expect(calculateDeliveryTotal(items, "Sylhet", STORE_CITY)).toBe(30);
  });

  it("uses the outside-city fee for a zila that isn't the store's city", () => {
    const items = [item({ deliveryFeeOutsideCity: 100 })];
    expect(calculateDeliveryTotal(items, "Dhaka", STORE_CITY)).toBe(100);
  });
});
