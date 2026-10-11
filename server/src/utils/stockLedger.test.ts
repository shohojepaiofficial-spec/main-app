import { describe, expect, it, vi } from "vitest";
vi.mock("../models/StockMovement", () => ({ StockMovement: { insertMany: vi.fn() } }));
import { StockMovement } from "../models/StockMovement";
import { orderStockMovements, recordStockMovements, stockAdjustments } from "./stockLedger";
import { lowStockRows } from "./lowStock";

const black = [{ name: "Color", value: "Black" }, { name: "Size", value: "L" }];
const white = [{ name: "Color", value: "White" }, { name: "Size", value: "L" }];

describe("orderStockMovements", () => {
  it("records a sale as negative and skips pre-order lines", () => {
    const rows = orderStockMovements(
      [{ product: "p", variant: "v", variantLabel: "Black / L", quantity: 2 }, { product: "q", quantity: 1, isPreorder: true }],
      "sale", { order: "o" },
    );
    expect(rows).toEqual([{ product: "p", variant: "v", variantLabel: "Black / L", change: -2, reason: "sale", order: "o" }]);
  });
});

describe("stockAdjustments", () => {
  it("diffs a simple product's stock", () => {
    expect(stockAdjustments("p", { stock: 4 }, { stock: 10 }, "admin")).toEqual([
      { product: "p", variant: undefined, variantLabel: undefined, change: 6, reason: "adjustment", actor: "admin" },
    ]);
    expect(stockAdjustments("p", { stock: 4 }, { stock: 4 }, "admin")).toEqual([]);
  });

  it("diffs per variant, counting new variants from 0 and deleted ones down to 0", () => {
    const before = { stock: 5, variants: [{ _id: "a", selections: black, stock: 2 }, { _id: "b", selections: white, stock: 3 }] };
    const after = { stock: 9, variants: [{ _id: "a", selections: black, stock: 7 }, { _id: "c", selections: white, stock: 2 }] };
    const rows = stockAdjustments("p", before, after, "admin");
    expect(rows.map((r) => [r.variant, r.variantLabel, r.change])).toEqual([
      ["a", "Black / L", 5], ["b", "White / L", -3], ["c", "White / L", 2],
    ]);
  });

  it("records a new product's opening stock", () => {
    expect(stockAdjustments("p", null, { stock: 8 }, "admin").map((r) => r.change)).toEqual([8]);
  });
});

describe("recordStockMovements", () => {
  it("writes nothing when every change is zero", async () => {
    await recordStockMovements([{ product: "p", change: 0, reason: "adjustment" }], {} as never);
    expect(StockMovement.insertMany).not.toHaveBeenCalled();
  });
});

describe("lowStockRows", () => {
  it("lists each low variant on its own, lowest first, even when the total is high", () => {
    const rows = lowStockRows([
      { _id: "p1", name: "Hoodie", stock: 22, variants: [{ _id: "a", selections: black, stock: 20 }, { _id: "b", selections: white, stock: 2 }] },
      { _id: "p2", name: "Mug", stock: 1, variants: [] },
      { _id: "p3", name: "Tea", stock: 50, variants: [] },
    ]);
    expect(rows).toEqual([
      { _id: "p2", name: "Mug", stock: 1 },
      { _id: "p1", name: "Hoodie", variantId: "b", variantLabel: "White / L", stock: 2 },
    ]);
  });
});
