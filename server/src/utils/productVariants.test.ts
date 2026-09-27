import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import {
  normalizeVariantInput,
  presetOptionsForCategory,
  resolvePurchasable,
  summarizeVariants,
} from "./productVariants";

const options = [
  { name: "Color", values: ["Black", "Grey"] },
  { name: "Size", values: ["M", "L"] },
];

function variant(color: string, size: string, extra: Record<string, unknown> = {}) {
  return {
    selections: [
      { name: "Color", value: color },
      { name: "Size", value: size },
    ],
    price: 900,
    stock: 2,
    ...extra,
  };
}

describe("normalizeVariantInput", () => {
  it("returns nothing for a simple product", () => {
    expect(normalizeVariantInput(undefined, undefined, [], [])).toEqual({ options: [], variants: [] });
    expect(normalizeVariantInput("[]", "[]", [], [])).toEqual({ options: [], variants: [] });
  });

  it("parses JSON strings from a multipart form and trims/normalizes labels", () => {
    const result = normalizeVariantInput(
      JSON.stringify([{ name: "  Color ", values: [" Black", "Grey "] }]),
      JSON.stringify([{ selections: [{ name: "color", value: "black" }], price: "750", stock: "4" }]),
      [],
      []
    );
    expect(result.options).toEqual([{ name: "Color", values: ["Black", "Grey"] }]);
    // Stored with the option's own casing, not whatever the variant sent.
    expect(result.variants[0].selections).toEqual([{ name: "Color", value: "Black" }]);
    expect(result.variants[0].price).toBe(750);
    expect(result.variants[0].stock).toBe(4);
  });

  it("keeps an existing variant id so carts and orders keep pointing at it", () => {
    const id = new Types.ObjectId().toString();
    const result = normalizeVariantInput(options, [variant("Black", "L", { _id: id })], [], []);
    expect(result.variants[0]._id.toString()).toBe(id);
  });

  it("rejects a duplicate combination", () => {
    expect(() => normalizeVariantInput(options, [variant("Black", "L"), variant("black", "l")], [], [])).toThrow();
  });

  it("rejects a value that isn't one of the option's values", () => {
    expect(() => normalizeVariantInput(options, [variant("Red", "L")], [], [])).toThrowError();
    try {
      normalizeVariantInput(options, [variant("Red", "L")], [], []);
    } catch (err) {
      expect(err).toMatchObject({ status: 400, message: '"Red" isn\'t one of the Color values' });
    }
  });

  it("rejects a variant missing an option", () => {
    expect(() =>
      normalizeVariantInput(options, [{ selections: [{ name: "Color", value: "Black" }], price: 1, stock: 1 }], [], [])
    ).toThrow();
  });

  it("rejects options with no variants, and variants with no options", () => {
    expect(() => normalizeVariantInput(options, [], [], [])).toThrow();
    expect(() => normalizeVariantInput([], [variant("Black", "L")], [], [])).toThrow();
  });

  it("rejects a non-string (injected operator) option name", () => {
    expect(() => normalizeVariantInput([{ name: { $gt: "" }, values: ["a"] }], [], [], [])).toThrow();
  });

  it("rejects negative prices and fractional stock", () => {
    expect(() => normalizeVariantInput(options, [variant("Black", "L", { price: -1 })], [], [])).toThrow();
    expect(() => normalizeVariantInput(options, [variant("Black", "L", { stock: 1.5 })], [], [])).toThrow();
  });

  it("resolves a new:N image to the uploaded URL and drops an image no longer on the product", () => {
    const result = normalizeVariantInput(
      options,
      [variant("Black", "L", { image: "new:1" }), variant("Grey", "M", { image: "https://old/removed.jpg" })],
      ["https://kept.jpg", "https://up0.jpg", "https://up1.jpg"],
      ["https://up0.jpg", "https://up1.jpg"]
    );
    expect(result.variants[0].image).toBe("https://up1.jpg");
    expect(result.variants[1].image).toBeUndefined();
  });
});

describe("summarizeVariants", () => {
  it("uses the lowest price and the total stock", () => {
    expect(
      summarizeVariants([
        { price: 900, stock: 2 },
        { price: 750, stock: 0 },
        { price: 1200, stock: 5 },
      ])
    ).toEqual({ price: 750, stock: 7 });
  });
});

describe("resolvePurchasable", () => {
  const blackL = { _id: new Types.ObjectId(), ...variant("Black", "L", { weightKg: 1.2, image: "https://b.jpg" }) };
  const product = { name: "Hoodie", price: 900, stock: 2, weightKg: 0.5, options, variants: [blackL] };

  it("uses the product itself for a simple product", () => {
    expect(resolvePurchasable({ ...product, options: [], variants: [] }, undefined)).toEqual({
      price: 900,
      stock: 2,
      weightKg: 0.5,
    });
  });

  it("uses the variant's own price/stock/weight/image", () => {
    const line = resolvePurchasable(product, blackL._id.toString());
    expect(line).toMatchObject({ price: 900, stock: 2, weightKg: 1.2 });
    expect(line.variant).toMatchObject({ label: "Black / L", image: "https://b.jpg" });
  });

  it("throws when a product with variants has no variant picked", () => {
    expect(() => resolvePurchasable(product, undefined)).toThrow();
    expect(() => resolvePurchasable(product, { $ne: null })).toThrow();
  });
});

describe("presetOptionsForCategory", () => {
  it("matches common categories by keyword", () => {
    expect(presetOptionsForCategory("Hoodies").map((o) => o.name)).toEqual(["Size", "Color"]);
    expect(presetOptionsForCategory("Supplements").map((o) => o.name)).toEqual(["Weight", "Flavor"]);
    expect(presetOptionsForCategory("Laptops").map((o) => o.name)).toEqual(["Storage", "Color"]);
  });

  it("suggests nothing for an unrecognized category", () => {
    expect(presetOptionsForCategory("Books")).toEqual([]);
  });
});
