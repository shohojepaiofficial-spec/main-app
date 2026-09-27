import { describe, it, expect } from "vitest";
import { roundDownForDisplay, visibleStats } from "./storeStats";
import type { StoreStats } from "@/models";

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
  it("never rounds up", () => {
    expect(roundDownForDisplay(7)).toBe("7");
    expect(roundDownForDisplay(10)).toBe("10");
    expect(roundDownForDisplay(47)).toBe("40+");
    expect(roundDownForDisplay(199)).toBe("150+");
    expect(roundDownForDisplay(1250)).toBe("1,200+");
  });
});

describe("visibleStats", () => {
  it("shows nothing without data", () => {
    expect(visibleStats(null)).toEqual([]);
  });

  it("hides stats below their threshold", () => {
    const result = visibleStats(stats({ productCount: 10, categoryCount: 8, reviewCount: 2, averageRating: 5 }));
    expect(result.map((s) => s.kind)).toEqual(["products", "categories"]);
  });

  it("hides the whole row when fewer than two stats qualify", () => {
    expect(visibleStats(stats({ productCount: 50 }))).toEqual([]);
  });

  it("hides a low average rating even with enough reviews", () => {
    const result = visibleStats(stats({ productCount: 50, categoryCount: 5, reviewCount: 30, averageRating: 3.6 }));
    expect(result.map((s) => s.kind)).not.toContain("rating");
  });

  it("truncates the rating instead of rounding it up", () => {
    const result = visibleStats(stats({ productCount: 50, reviewCount: 30, averageRating: 4.76 }));
    expect(result.find((s) => s.kind === "rating")).toMatchObject({ value: "4.7", count: 30 });
  });
});
