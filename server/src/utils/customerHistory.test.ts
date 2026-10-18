import { describe, expect, it } from "vitest";
import { summarizeCustomerHistory } from "./customerHistory";

const order = (id: string, status: "pending" | "paid" | "shipped" | "delivered" | "cancelled", totalAmount: number, day: number) =>
  ({ _id: id, status, totalAmount, createdAt: new Date(2026, 9, day), items: [{}, {}] });

describe("customer history", () => {
  it("counts orders, money spent and flags the current order, newest first", () => {
    const summary = summarizeCustomerHistory(
      [order("a", "delivered", 1000, 1), order("c", "pending", 500, 10), order("b", "cancelled", 700, 5)], "c", 1,
    );
    expect(summary).toMatchObject({ totalOrders: 3, delivered: 1, cancelled: 1, open: 1, returns: 1, totalSpent: 1000, risk: "ok" });
    expect(summary.orders.map((o) => o._id)).toEqual(["c", "b", "a"]);
    expect(summary.orders[0]).toMatchObject({ isCurrent: true, itemCount: 2 });
    expect(summary.firstOrderAt).toEqual(new Date(2026, 9, 1));
    expect(summary.lastOrderAt).toEqual(new Date(2026, 9, 10));
  });
  it("marks a first order as new and a frequent canceller for a closer look", () => {
    expect(summarizeCustomerHistory([order("a", "pending", 500, 1)], "a", 0).risk).toBe("new");
    const canceller = [order("a", "cancelled", 1, 1), order("b", "cancelled", 1, 2), order("c", "delivered", 1, 3), order("d", "pending", 1, 4)];
    expect(summarizeCustomerHistory(canceller, "d", 0).risk).toBe("watch");
  });
});
