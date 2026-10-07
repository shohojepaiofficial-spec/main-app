import { describe, it, expect, vi, beforeEach } from "vitest";

// Mongoose model mocks — computeOrderTotals/decrementStockAtomically only
// ever call `.find()`/`.findOne()`/`.updateOne()` on these, chained with
// `.session(...)`, so the mocks just need to support that same shape.
vi.mock("../models/Product", () => ({
  Product: { find: vi.fn(), updateOne: vi.fn() },
}));
vi.mock("../models/PromoCode", () => ({
  PromoCode: { findOne: vi.fn() },
}));

import { Product } from "../models/Product";
import { PromoCode } from "../models/PromoCode";
import { Types } from "mongoose";
import { computeOrderTotals, decrementStockAtomically, restoreStock } from "./orderController";

function queryResult<T>(result: T) {
  // Mirrors the real `Model.find(...).session(session ?? null)` chain used
  // in orderController — a thenable isn't needed since the code always
  // calls `.session()` before awaiting.
  return { session: () => Promise.resolve(result) };
}

const STORE_CITY_ZILA = "Sylhet";
const OUTSIDE_ZILA = "Dhaka";
// Pathao isn't configured in this test env (no PATHAO_* vars), so
// resolveDeliveryFee always falls straight through to the flat fee — this
// value is never actually used to look anything up.
const TEST_UPAZILA = "Sylhet Sadar";

function fakeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p1",
    name: "Towel",
    price: 200,
    stock: 10,
    deliveryFeeInsideCity: 10,
    deliveryFeeOutsideCity: 100,
    weightKg: 0.5,
    options: [],
    variants: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(Product.find).mockReset();
  vi.mocked(Product.updateOne).mockReset();
  vi.mocked(PromoCode.findOne).mockReset();
});

describe("computeOrderTotals", () => {
  it("computes itemsTotal/deliveryFee/totalAmount for a normal order", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct()]) as never);

    const result = await computeOrderTotals(
      [{ productId: "p1", quantity: 2 }],
      STORE_CITY_ZILA,
      TEST_UPAZILA
    );

    expect(result.itemsTotal).toBe(400); // 200 * 2
    expect(result.deliveryFee).toBe(10); // inside-city fee, once per line
    expect(result.deliveryFeeSource).toBe("flat");
    expect(result.discount).toBe(0);
    expect(result.totalAmount).toBe(410);
  });

  it("uses the outside-city delivery fee when the zila isn't the store's city", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct()]) as never);

    const result = await computeOrderTotals(
      [{ productId: "p1", quantity: 1 }],
      OUTSIDE_ZILA,
      TEST_UPAZILA
    );

    expect(result.deliveryFee).toBe(100);
  });

  it("throws 409 when a line requests more than is in stock", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct({ stock: 1 })]) as never);

    await expect(
      computeOrderTotals([{ productId: "p1", quantity: 2 }], STORE_CITY_ZILA, TEST_UPAZILA)
    ).rejects.toMatchObject({ status: 409 });
  });

  it("throws 400 for a product that no longer exists", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([]) as never);

    await expect(
      computeOrderTotals([{ productId: "gone", quantity: 1 }], STORE_CITY_ZILA, TEST_UPAZILA)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 for an invalid quantity", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct()]) as never);

    await expect(
      computeOrderTotals([{ productId: "p1", quantity: 0 }], STORE_CITY_ZILA, TEST_UPAZILA)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("applies a sitewide percentage promo to the whole items total", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct()]) as never);
    vi.mocked(PromoCode.findOne).mockReturnValue(
      queryResult({
        code: "SAVE10",
        discountType: "percentage",
        value: 10,
        scope: "all",
        isActive: true,
        expiresAt: undefined,
      }) as never
    );

    const result = await computeOrderTotals(
      [{ productId: "p1", quantity: 1 }],
      STORE_CITY_ZILA,
      TEST_UPAZILA,
      "save10"
    );

    expect(result.discount).toBe(20); // 10% of 200
    expect(result.appliedCode).toBe("SAVE10");
    expect(result.totalAmount).toBe(190); // 200 + 10 delivery - 20
  });

  it("applies a product-scoped flat promo only to its own line", async () => {
    vi.mocked(Product.find).mockReturnValue(
      queryResult([fakeProduct(), fakeProduct({ id: "p2", name: "Other", price: 500 })]) as never
    );
    vi.mocked(PromoCode.findOne).mockReturnValue(
      queryResult({
        code: "P1OFF",
        discountType: "flat",
        value: 50,
        scope: "product",
        product: "p1",
        isActive: true,
        expiresAt: undefined,
      }) as never
    );

    const result = await computeOrderTotals(
      [
        { productId: "p1", quantity: 1 },
        { productId: "p2", quantity: 1 },
      ],
      STORE_CITY_ZILA,
      TEST_UPAZILA,
      "p1off"
    );

    expect(result.discount).toBe(50);
  });

  it("ignores an expired promo code (discount stays 0)", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct()]) as never);
    vi.mocked(PromoCode.findOne).mockReturnValue(
      queryResult({
        code: "OLD10",
        discountType: "percentage",
        value: 10,
        scope: "all",
        isActive: true,
        expiresAt: new Date("2000-01-01"),
      }) as never
    );

    const result = await computeOrderTotals(
      [{ productId: "p1", quantity: 1 }],
      STORE_CITY_ZILA,
      TEST_UPAZILA,
      "old10"
    );

    expect(result.discount).toBe(0);
    expect(result.appliedCode).toBeUndefined();
  });

  it("caps a flat discount at the items total, never the delivery fee too", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct({ price: 30 })]) as never);
    vi.mocked(PromoCode.findOne).mockReturnValue(
      queryResult({
        code: "HUGE",
        discountType: "flat",
        value: 1000,
        scope: "all",
        isActive: true,
        expiresAt: undefined,
      }) as never
    );

    const result = await computeOrderTotals(
      [{ productId: "p1", quantity: 1 }],
      STORE_CITY_ZILA,
      TEST_UPAZILA,
      "huge"
    );

    // discount = min(1000, itemsTotal=30) = 30, so total = 30 + 10 delivery - 30 = 10
    expect(result.discount).toBe(30);
    expect(result.totalAmount).toBe(10);
  });
});

describe("computeOrderTotals with variants", () => {
  const blackL = { _id: new Types.ObjectId(), selections: [{ name: "Color", value: "Black" }, { name: "Size", value: "L" }], price: 900, stock: 3, sku: "HD-BL-L" };
  const greyM = { _id: new Types.ObjectId(), selections: [{ name: "Color", value: "Grey" }, { name: "Size", value: "M" }], price: 800, stock: 0, weightKg: 2 };
  const hoodie = () =>
    fakeProduct({
      name: "Hoodie",
      price: 800,
      stock: 3,
      options: [
        { name: "Color", values: ["Black", "Grey"] },
        { name: "Size", values: ["M", "L"] },
      ],
      variants: [blackL, greyM],
    });

  it("charges the variant's own price and snapshots its label/selections/sku", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([hoodie()]) as never);

    const result = await computeOrderTotals(
      [{ productId: "p1", variantId: blackL._id.toString(), quantity: 2 }],
      STORE_CITY_ZILA,
      TEST_UPAZILA
    );

    expect(result.itemsTotal).toBe(1800);
    expect(result.orderItems[0]).toMatchObject({
      price: 900,
      variant: blackL._id.toString(),
      variantLabel: "Black / L",
      selections: [
        { name: "Color", value: "Black" },
        { name: "Size", value: "L" },
      ],
      sku: "HD-BL-L",
    });
  });

  it("rejects a product with variants when no variant was picked", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([hoodie()]) as never);

    await expect(
      computeOrderTotals([{ productId: "p1", quantity: 1 }], STORE_CITY_ZILA, TEST_UPAZILA)
    ).rejects.toMatchObject({ status: 400, message: 'Please choose color and size for "Hoodie"' });
  });

  it("rejects a variant id that no longer exists on the product", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([hoodie()]) as never);

    await expect(
      computeOrderTotals(
        [{ productId: "p1", variantId: new Types.ObjectId().toString(), quantity: 1 }],
        STORE_CITY_ZILA,
        TEST_UPAZILA
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("checks stock per variant, not the product total", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([hoodie()]) as never);

    await expect(
      computeOrderTotals(
        [{ productId: "p1", variantId: greyM._id.toString(), quantity: 1 }],
        STORE_CITY_ZILA,
        TEST_UPAZILA
      )
    ).rejects.toMatchObject({ status: 409, message: 'Not enough stock for "Hoodie (Grey / M)"' });
  });

  it("charges the flat delivery fee once per product, even across two variants", async () => {
    const withStock = hoodie();
    (withStock.variants as { stock: number }[])[1].stock = 5;
    vi.mocked(Product.find).mockReturnValue(queryResult([withStock]) as never);

    const result = await computeOrderTotals(
      [
        { productId: "p1", variantId: blackL._id.toString(), quantity: 1 },
        { productId: "p1", variantId: greyM._id.toString(), quantity: 1 },
      ],
      OUTSIDE_ZILA,
      TEST_UPAZILA
    );

    expect(result.itemsTotal).toBe(1700);
    expect(result.deliveryFee).toBe(100);
  });

  it("applies a product-scoped promo across every variant line of that product", async () => {
    const withStock = hoodie();
    (withStock.variants as { stock: number }[])[1].stock = 5;
    vi.mocked(Product.find).mockReturnValue(queryResult([withStock]) as never);
    vi.mocked(PromoCode.findOne).mockReturnValue(
      queryResult({
        code: "HOODIE10",
        discountType: "percentage",
        value: 10,
        scope: "product",
        product: "p1",
        isActive: true,
        expiresAt: undefined,
      }) as never
    );

    const result = await computeOrderTotals(
      [
        { productId: "p1", variantId: blackL._id.toString(), quantity: 1 },
        { productId: "p1", variantId: greyM._id.toString(), quantity: 1 },
      ],
      STORE_CITY_ZILA,
      TEST_UPAZILA,
      "hoodie10"
    );

    expect(result.discount).toBe(170); // 10% of 900 + 800
  });
});

describe("decrementStockAtomically", () => {
  const items = [{ product: "p1", quantity: 2, name: "Towel" }];
  const fakeSession = {} as never;

  it("succeeds when the conditional update matches", async () => {
    vi.mocked(Product.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    await expect(decrementStockAtomically(items, fakeSession)).resolves.toBeUndefined();
    expect(Product.updateOne).toHaveBeenCalledWith(
      { _id: "p1", stock: { $gte: 2 } },
      { $inc: { stock: -2 } },
      { session: fakeSession }
    );
  });

  it("throws a 409 'sold out' error when the conditional update matches nothing", async () => {
    vi.mocked(Product.updateOne).mockResolvedValue({ modifiedCount: 0 } as never);

    await expect(decrementStockAtomically(items, fakeSession)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("stops at the first failing line instead of decrementing later ones", async () => {
    vi.mocked(Product.updateOne).mockResolvedValueOnce({ modifiedCount: 0 } as never);

    const twoItems = [
      { product: "p1", quantity: 1, name: "Towel" },
      { product: "p2", quantity: 1, name: "Creatine" },
    ];

    await expect(decrementStockAtomically(twoItems, fakeSession)).rejects.toMatchObject({ status: 409 });
    expect(Product.updateOne).toHaveBeenCalledTimes(1);
  });

  it("conditions a variant line on that variant's stock and moves the product total with it", async () => {
    vi.mocked(Product.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    await decrementStockAtomically(
      [{ product: "p1", quantity: 2, name: "Hoodie", variant: "v1", variantLabel: "Black / L" }],
      fakeSession
    );
    expect(Product.updateOne).toHaveBeenCalledWith(
      { _id: "p1", variants: { $elemMatch: { _id: "v1", stock: { $gte: 2 } } } },
      { $inc: { "variants.$.stock": -2, stock: -2 } },
      { session: fakeSession }
    );
  });

  it("names the variant in the sold-out message", async () => {
    vi.mocked(Product.updateOne).mockResolvedValue({ modifiedCount: 0 } as never);

    await expect(
      decrementStockAtomically(
        [{ product: "p1", quantity: 1, name: "Hoodie", variant: "v1", variantLabel: "Black / L" }],
        fakeSession
      )
    ).rejects.toMatchObject({ message: '"Hoodie (Black / L)" just sold out — please update your cart and try again.' });
  });
});

describe("restoreStock", () => {
  it("puts a variant line back into that variant and the product total", async () => {
    vi.mocked(Product.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    await restoreStock({
      items: [
        { product: "p1", quantity: 2, variant: "v1" },
        { product: "p2", quantity: 1 },
      ],
    });

    expect(Product.updateOne).toHaveBeenCalledWith(
      { _id: "p1", "variants._id": "v1" },
      { $inc: { "variants.$.stock": 2, stock: 2 } }
    );
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: "p2" }, { $inc: { stock: 1 } });
  });
});

describe("pre-orders", () => {
  const preorderProduct = (preorder: Record<string, unknown> = {}) =>
    fakeProduct({
      stock: 0,
      price: 1000,
      preorder: {
        enabled: true,
        reserved: 0,
        codDiscountPercent: 5,
        onlineDiscountPercent: 10,
        ...preorder,
      },
    });

  it("accepts a pre-order product with no stock and gives the Cash on Delivery discount", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([preorderProduct()]) as never);

    const result = await computeOrderTotals([{ productId: "p1", quantity: 2 }], STORE_CITY_ZILA, TEST_UPAZILA);

    expect(result.isPreorder).toBe(true);
    expect(result.orderItems[0].isPreorder).toBe(true);
    expect(result.preorderDiscount).toBe(100); // 5% of 2000
    expect(result.totalAmount).toBe(1910); // 2000 + 10 delivery - 100
  });

  it("gives the bigger online discount when paying with bKash", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([preorderProduct()]) as never);

    const result = await computeOrderTotals(
      [{ productId: "p1", quantity: 2 }],
      STORE_CITY_ZILA,
      TEST_UPAZILA,
      undefined,
      undefined,
      "bkash"
    );

    expect(result.preorderDiscount).toBe(200); // 10% of 2000
  });

  it("only discounts the pre-order lines, and stacks with a promo code", async () => {
    vi.mocked(Product.find).mockReturnValue(
      queryResult([preorderProduct(), fakeProduct({ id: "p2", name: "Towel", price: 200 })]) as never
    );
    vi.mocked(PromoCode.findOne).mockReturnValue(
      queryResult({ code: "SAVE10", discountType: "percentage", value: 10, scope: "all", isActive: true }) as never
    );

    const result = await computeOrderTotals(
      [
        { productId: "p1", quantity: 1 },
        { productId: "p2", quantity: 1 },
      ],
      STORE_CITY_ZILA,
      TEST_UPAZILA,
      "save10"
    );

    expect(result.orderItems[1].isPreorder).toBeUndefined();
    expect(result.preorderDiscount).toBe(50); // 5% of 1000, not of the towel
    expect(result.discount).toBe(120); // promo: 10% of 1200
    expect(result.totalAmount).toBe(1200 + 20 - 120 - 50);
  });

  it("rejects more units than the pre-order cap has left, counting every line of the product", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([preorderProduct({ limit: 10, reserved: 8 })]) as never);

    await expect(
      computeOrderTotals([{ productId: "p1", quantity: 3 }], STORE_CITY_ZILA, TEST_UPAZILA)
    ).rejects.toMatchObject({ status: 409, message: 'Only 2 pre-order spots left for "Towel"' });
  });

  it("uses the latest ship date as the order's expected ship date", async () => {
    vi.mocked(Product.find).mockReturnValue(
      queryResult([
        preorderProduct({ shipDate: new Date("2026-11-10") }),
        { ...preorderProduct({ shipDate: new Date("2026-11-20") }), id: "p2" },
      ]) as never
    );

    const result = await computeOrderTotals(
      [
        { productId: "p1", quantity: 1 },
        { productId: "p2", quantity: 1 },
      ],
      STORE_CITY_ZILA,
      TEST_UPAZILA
    );

    expect(result.expectedShipDate).toEqual(new Date("2026-11-20"));
  });

  it("reserves a pre-order spot instead of taking stock, conditioned on the cap", async () => {
    vi.mocked(Product.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);
    const fakeSession = {} as never;

    await decrementStockAtomically(
      [{ product: "p1", quantity: 2, name: "Towel", isPreorder: true, preorderLimit: 10 }],
      fakeSession
    );

    expect(Product.updateOne).toHaveBeenCalledWith(
      { _id: "p1", "preorder.enabled": true, "preorder.reserved": { $lte: 8 } },
      { $inc: { "preorder.reserved": 2 } },
      { session: fakeSession }
    );
  });

  it("fails with 409 when pre-order was switched off or filled up in the meantime", async () => {
    vi.mocked(Product.updateOne).mockResolvedValue({ modifiedCount: 0 } as never);

    await expect(
      decrementStockAtomically([{ product: "p1", quantity: 1, name: "Towel", isPreorder: true }], {} as never)
    ).rejects.toMatchObject({ status: 409 });
  });

  it("gives back the pre-order spot, not stock, on cancellation", async () => {
    vi.mocked(Product.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);

    await restoreStock({ items: [{ product: "p1", quantity: 2, isPreorder: true }] });

    expect(Product.updateOne).toHaveBeenCalledWith(
      { _id: "p1", "preorder.reserved": { $gte: 2 } },
      { $inc: { "preorder.reserved": -2 } }
    );
  });
});
