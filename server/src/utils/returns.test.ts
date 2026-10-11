import { describe, expect, it, vi } from "vitest";
vi.mock("../models/Product", () => ({ Product: { updateOne: vi.fn() } }));
import { Types } from "mongoose";
import { Product } from "../models/Product";
import {
  buildReturnItems, canTransition, claimedQuantities, isWithinReturnWindow, itemsValue, restockReturnItems, returnWindowEndsAt,
} from "./returns";

const day = 24 * 60 * 60 * 1000;
const productA = new Types.ObjectId();
const variantA = new Types.ObjectId();
const order = {
  items: [
    { product: { _id: productA, name: "Hoodie" }, quantity: 2, price: 1200, variant: variantA, variantLabel: "Black / L" },
    { product: new Types.ObjectId(), quantity: 1, price: 300 },
  ],
} as never;

describe("return window", () => {
  it("runs 7 days from delivery, falling back to the last update for older orders", () => {
    const deliveredAt = new Date("2026-10-01T10:00:00Z");
    expect(returnWindowEndsAt({ deliveredAt, updatedAt: new Date() }).toISOString()).toBe("2026-10-08T10:00:00.000Z");
    expect(returnWindowEndsAt({ updatedAt: deliveredAt } as never).toISOString()).toBe("2026-10-08T10:00:00.000Z");
    expect(isWithinReturnWindow({ deliveredAt, updatedAt: deliveredAt }, new Date(deliveredAt.getTime() + 7 * day))).toBe(true);
    expect(isWithinReturnWindow({ deliveredAt, updatedAt: deliveredAt }, new Date(deliveredAt.getTime() + 7 * day + 1))).toBe(false);
  });
});

describe("status transitions", () => {
  it("only moves forward and never out of a finished state", () => {
    expect(canTransition("requested", "approved")).toBe(true);
    expect(canTransition("approved", "received")).toBe(true);
    expect(canTransition("received", "completed")).toBe(true);
    expect(canTransition("requested", "completed")).toBe(false);
    expect(canTransition("received", "rejected")).toBe(false);
    expect(canTransition("completed", "received")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
  });
});

describe("buildReturnItems", () => {
  it("snapshots the order line, variant and unit price", () => {
    const [item] = buildReturnItems(order, [{ orderItemIndex: 0, quantity: 1 }], new Map());
    expect(item).toMatchObject({ orderItemIndex: 0, product: productA, variant: variantA, name: "Hoodie", variantLabel: "Black / L", quantity: 1, price: 1200 });
  });
  it("refuses more units than were bought or are still unclaimed", () => {
    expect(() => buildReturnItems(order, [{ orderItemIndex: 0, quantity: 3 }], new Map())).toThrow("at most 2");
    expect(() => buildReturnItems(order, [{ orderItemIndex: 1, quantity: 1 }], new Map([[1, 1]]))).toThrow("already has a return request");
  });
  it("refuses lines the order doesn't have, duplicates and empty requests", () => {
    expect(() => buildReturnItems(order, [{ orderItemIndex: 5, quantity: 1 }], new Map())).toThrow("isn't part of this order");
    expect(() => buildReturnItems(order, [{ orderItemIndex: 0, quantity: 1 }, { orderItemIndex: 0, quantity: 1 }], new Map())).toThrow();
    expect(() => buildReturnItems(order, [], new Map())).toThrow("at least one");
  });
});

describe("claimedQuantities", () => {
  it("counts open and finished requests but frees rejected ones", () => {
    const claimed = claimedQuantities([
      { status: "requested", items: [{ orderItemIndex: 0, quantity: 1 }] },
      { status: "completed", items: [{ orderItemIndex: 0, quantity: 1 }] },
      { status: "rejected", items: [{ orderItemIndex: 1, quantity: 1 }] },
    ] as never);
    expect(claimed.get(0)).toBe(2);
    expect(claimed.has(1)).toBe(false);
  });
});

describe("restockReturnItems", () => {
  it("returns variant units to the variant and the total, and reports deleted variants", async () => {
    vi.mocked(Product.updateOne).mockResolvedValueOnce({ matchedCount: 1 } as never).mockResolvedValueOnce({ matchedCount: 0 } as never);
    const items = buildReturnItems(order, [{ orderItemIndex: 0, quantity: 2 }, { orderItemIndex: 1, quantity: 1 }], new Map());
    const skipped = await restockReturnItems(items, {} as never);
    expect(Product.updateOne).toHaveBeenNthCalledWith(1, { _id: productA, "variants._id": variantA }, { $inc: { "variants.$.stock": 2, stock: 2 } }, { session: {} });
    expect(skipped).toBe(1);
    expect(itemsValue(items)).toBe(2700);
  });
});
