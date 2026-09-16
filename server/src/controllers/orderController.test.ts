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
import { computeOrderTotals, decrementStockAtomically } from "./orderController";

function queryResult<T>(result: T) {
  // Mirrors the real `Model.find(...).session(session ?? null)` chain used
  // in orderController — a thenable isn't needed since the code always
  // calls `.session()` before awaiting.
  return { session: () => Promise.resolve(result) };
}

const STORE_CITY_ZILA = "Sylhet";
const OUTSIDE_ZILA = "Dhaka";

function fakeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p1",
    name: "Towel",
    price: 200,
    stock: 10,
    deliveryFeeInsideCity: 10,
    deliveryFeeOutsideCity: 100,
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

    const result = await computeOrderTotals([{ productId: "p1", quantity: 2 }], STORE_CITY_ZILA);

    expect(result.itemsTotal).toBe(400); // 200 * 2
    expect(result.deliveryFee).toBe(10); // inside-city fee, once per line
    expect(result.discount).toBe(0);
    expect(result.totalAmount).toBe(410);
  });

  it("uses the outside-city delivery fee when the zila isn't the store's city", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct()]) as never);

    const result = await computeOrderTotals([{ productId: "p1", quantity: 1 }], OUTSIDE_ZILA);

    expect(result.deliveryFee).toBe(100);
  });

  it("throws 409 when a line requests more than is in stock", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct({ stock: 1 })]) as never);

    await expect(
      computeOrderTotals([{ productId: "p1", quantity: 2 }], STORE_CITY_ZILA)
    ).rejects.toMatchObject({ status: 409 });
  });

  it("throws 400 for a product that no longer exists", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([]) as never);

    await expect(
      computeOrderTotals([{ productId: "gone", quantity: 1 }], STORE_CITY_ZILA)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 for an invalid quantity", async () => {
    vi.mocked(Product.find).mockReturnValue(queryResult([fakeProduct()]) as never);

    await expect(
      computeOrderTotals([{ productId: "p1", quantity: 0 }], STORE_CITY_ZILA)
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

    const result = await computeOrderTotals([{ productId: "p1", quantity: 1 }], STORE_CITY_ZILA, "save10");

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

    const result = await computeOrderTotals([{ productId: "p1", quantity: 1 }], STORE_CITY_ZILA, "old10");

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

    const result = await computeOrderTotals([{ productId: "p1", quantity: 1 }], STORE_CITY_ZILA, "huge");

    // discount = min(1000, itemsTotal=30) = 30, so total = 30 + 10 delivery - 30 = 10
    expect(result.discount).toBe(30);
    expect(result.totalAmount).toBe(10);
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
});
