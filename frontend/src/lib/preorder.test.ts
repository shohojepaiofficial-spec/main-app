import { describe, it, expect } from "vitest";
import {
  bestPreorderPercents,
  calculatePreorderDiscount,
  latestShipDate,
  preorderSpotsLeft,
  toCartPreorder,
} from "./preorder";
import { CartItem } from "@/models";

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    name: "Towel",
    price: 1000,
    quantity: 1,
    deliveryFeeInsideCity: 10,
    deliveryFeeOutsideCity: 100,
    ...overrides,
  };
}

const preorder = { codDiscountPercent: 5, onlineDiscountPercent: 10 };

describe("calculatePreorderDiscount", () => {
  it("uses the COD or online percent depending on how the order is paid", () => {
    const items = [item({ quantity: 2, preorder })];
    expect(calculatePreorderDiscount(items, "cod")).toBe(100);
    expect(calculatePreorderDiscount(items, "bkash")).toBe(200);
  });

  it("ignores lines that aren't pre-orders and rounds to whole taka once", () => {
    const items = [item({ price: 333, preorder }), item({ productId: "p2", price: 333, preorder }), item({ productId: "p3" })];
    // 5% of 666 = 33.3 → 33
    expect(calculatePreorderDiscount(items, "cod")).toBe(33);
  });
});

describe("preorderSpotsLeft", () => {
  it("is 0 when not on pre-order, unlimited without a cap, and never negative", () => {
    expect(preorderSpotsLeft({})).toBe(0);
    expect(preorderSpotsLeft({ preorder: { enabled: true, reserved: 3, ...preorder } })).toBe(Infinity);
    expect(preorderSpotsLeft({ preorder: { enabled: true, limit: 5, reserved: 3, ...preorder } })).toBe(2);
    expect(preorderSpotsLeft({ preorder: { enabled: true, limit: 5, reserved: 9, ...preorder } })).toBe(0);
  });
});

describe("toCartPreorder", () => {
  it("is undefined for a product that isn't on pre-order", () => {
    expect(toCartPreorder({ preorder: { enabled: false, reserved: 0, ...preorder } })).toBeUndefined();
  });
});

describe("latestShipDate / bestPreorderPercents", () => {
  it("picks the latest date and the best percent per payment way", () => {
    const items = [
      item({ preorder: { ...preorder, shipDate: "2026-11-20T00:00:00.000Z" } }),
      item({ preorder: { codDiscountPercent: 8, onlineDiscountPercent: 9, shipDate: "2026-11-05T00:00:00.000Z" } }),
      item(),
    ];
    expect(latestShipDate(items)).toBe("2026-11-20T00:00:00.000Z");
    expect(bestPreorderPercents(items)).toEqual({ cod: 8, online: 10 });
  });
});
