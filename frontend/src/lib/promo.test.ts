import { describe, it, expect } from "vitest";
import { formatPromoDiscount, withPromoParam } from "./promo";
import { AppliedPromo } from "@/models";

function promo(overrides: Partial<AppliedPromo> = {}): AppliedPromo {
  return { code: "SAVE10", discountType: "percentage", value: 10, scope: "all", ...overrides };
}

describe("formatPromoDiscount", () => {
  it("formats a percentage discount", () => {
    expect(formatPromoDiscount(promo({ discountType: "percentage", value: 15 }))).toBe("15% off");
  });

  it("formats a flat discount using the currency formatter", () => {
    expect(formatPromoDiscount(promo({ discountType: "flat", value: 50 }))).toBe("৳50.00 off");
  });
});

describe("withPromoParam", () => {
  it("returns the href unchanged when there's no code", () => {
    expect(withPromoParam("/shop")).toBe("/shop");
  });

  it("appends the promo param to a bare path", () => {
    expect(withPromoParam("/shop", "SAVE10")).toBe("/shop?promo=SAVE10");
  });

  it("preserves and adds to an existing query string", () => {
    expect(withPromoParam("/shop?category=shoes", "SAVE10")).toBe(
      "/shop?category=shoes&promo=SAVE10"
    );
  });

  it("overwrites an existing promo param rather than duplicating it", () => {
    expect(withPromoParam("/shop?promo=OLD", "NEW")).toBe("/shop?promo=NEW");
  });
});
