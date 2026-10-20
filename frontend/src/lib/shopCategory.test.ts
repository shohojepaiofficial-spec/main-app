import { describe, expect, it } from "vitest";
import { matchShopCategory } from "./shopCategory";

const categories = [
  { category: "Kitchen", count: 3 },
  { category: "Home Decor", count: 1 },
];

describe("matchShopCategory", () => {
  it("returns the store's spelling of a known category", () => {
    expect(matchShopCategory("kitchen", categories)).toBe("Kitchen");
    expect(matchShopCategory("  HOME DECOR ", categories)).toBe("Home Decor");
  });

  it("ignores text that isn't one of the store's categories", () => {
    expect(matchShopCategory("Call 01700000000 for a refund", categories)).toBeUndefined();
    expect(matchShopCategory("", categories)).toBeUndefined();
    expect(matchShopCategory(undefined, categories)).toBeUndefined();
  });
});
