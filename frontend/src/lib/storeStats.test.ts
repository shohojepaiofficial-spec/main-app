import { describe, it, expect } from "vitest";
import { roundDownForDisplay, visibleStats } from "./storeStats";
import { StoreStats } from "@/models";

function stats(overrides: Partial<StoreStats> = {}): StoreStats {
  return {
    productCount: 0,
    categoryCount: 0,
    reviewCount: 0,
    averageRating: null,
    deliveredOrderCount: 0,
    districtCount: 0,
    ...overrides,
  };
}

describe("roundDownForDisplay", () => {
  it("shows small numbers exactly", () => {
    expect(roundDownForDisplay(7)).toBe("7");
  });

  it("rounds down, never up, with a plus when it rounded", () => {
    expect(roundDownForDisplay(47)).toBe("40+");
    expect(roundDownForDisplay(40)).toBe("40");
    expect(roundDownForDisplay(199)).toBe("150+");
    expect(roundDownForDisplay(1255)).toBe("1,200+");
  });
});

describe("visibleStats", () => {
  it("hides the section when stats failed to load", () => {
    expect(visibleStats(null)).toEqual([]);
  });

  it("hides the section when fewer than two stats qualify", () => {
    expect(visibleStats(stats({ productCount: 50 }))).toEqual([]);
  });

  it("shows only the stats that clear their thresholds", () => {
    const kinds = visibleStats(stats({ productCount: 10, categoryCount: 8, deliveredOrderCount: 19 })).map(
      (s) => s.kind
    );
    expect(kinds).toEqual(["products", "categories"]);
  });

  it("never advertises a mediocre or thinly-reviewed rating", () => {
    const base = { productCount: 10, categoryCount: 8 };
    expect(visibleStats(stats({ ...base, reviewCount: 20, averageRating: 3.9 })).map((s) => s.kind)).not.toContain(
      "rating"
    );
    expect(visibleStats(stats({ ...base, reviewCount: 4, averageRating: 5 })).map((s) => s.kind)).not.toContain(
      "rating"
    );
  });

  it("truncates the rating instead of rounding it up", () => {
    const rating = visibleStats(
      stats({ productCount: 10, categoryCount: 8, reviewCount: 12, averageRating: 4.76 })
    ).find((s) => s.kind === "rating");
    expect(rating).toMatchObject({ value: "4.7", count: 12 });
  });
});
