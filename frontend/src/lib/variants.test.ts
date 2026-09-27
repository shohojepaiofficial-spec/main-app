import { describe, it, expect } from "vitest";
import { allCombinations, combinationKey, findVariant, isValueAvailable, priceRange } from "./variants";
import type { ProductVariant } from "@/models";

const options = [
  { name: "Color", values: ["Black", "Grey"] },
  { name: "Size", values: ["M", "L"] },
];

function variant(id: string, color: string, size: string, price: number, stock: number): ProductVariant {
  return {
    _id: id,
    selections: [
      { name: "Color", value: color },
      { name: "Size", value: size },
    ],
    price,
    stock,
  };
}

const product = {
  price: 800,
  options,
  variants: [variant("a", "Black", "M", 800, 0), variant("b", "Black", "L", 900, 2), variant("c", "Grey", "M", 850, 1)],
};

describe("allCombinations", () => {
  it("builds every combination in option order", () => {
    expect(allCombinations(options).map((c) => c.map((s) => s.value).join("/"))).toEqual([
      "Black/M",
      "Black/L",
      "Grey/M",
      "Grey/L",
    ]);
  });

  it("ignores an option with no values yet", () => {
    expect(allCombinations([{ name: "Size", values: ["S"] }, { name: "Color", values: [] }])).toHaveLength(1);
    expect(allCombinations([])).toEqual([]);
  });
});

describe("combinationKey", () => {
  it("doesn't depend on selection order or case", () => {
    expect(
      combinationKey([
        { name: "Size", value: "L" },
        { name: "Color", value: "black" },
      ])
    ).toBe(
      combinationKey([
        { name: "color", value: "Black" },
        { name: "size", value: "l" },
      ])
    );
  });
});

describe("findVariant", () => {
  it("finds the variant once every option is picked", () => {
    expect(findVariant(product, { Color: "Black", Size: "L" })?._id).toBe("b");
  });

  it("returns nothing for a partial pick or a combination that doesn't exist", () => {
    expect(findVariant(product, { Color: "Black" })).toBeUndefined();
    expect(findVariant(product, { Color: "Grey", Size: "L" })).toBeUndefined();
  });
});

describe("isValueAvailable", () => {
  it("greys out a size that's sold out in the picked color", () => {
    expect(isValueAvailable(product, { Color: "Black" }, "Size", "M")).toBe(false);
    expect(isValueAvailable(product, { Color: "Grey" }, "Size", "M")).toBe(true);
  });

  it("treats a value as available if any in-stock combination uses it, before anything is picked", () => {
    expect(isValueAvailable(product, {}, "Size", "M")).toBe(true);
    expect(isValueAvailable(product, {}, "Color", "Grey")).toBe(true);
  });
});

describe("priceRange", () => {
  it("spans the variant prices", () => {
    expect(priceRange(product)).toEqual({ min: 800, max: 900 });
  });

  it("is a single price for a simple product", () => {
    expect(priceRange({ price: 500, variants: [] })).toEqual({ min: 500, max: 500 });
  });
});
