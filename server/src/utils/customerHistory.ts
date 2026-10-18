import type { IOrder } from "../models/Order";

// What staff see about a customer while confirming an order: every order
// they have placed with us, matched by account and by shipping phone (a
// staff-entered phone order has no account). Pure, so it is easy to test.
export type CustomerRisk = "new" | "ok" | "watch";

export interface HistoryOrder {
  _id: { toString(): string };
  status: IOrder["status"];
  totalAmount: number;
  createdAt: Date;
  items: unknown[];
}

export const HISTORY_ORDER_LIMIT = 20;

export function summarizeCustomerHistory(orders: HistoryOrder[], currentOrderId: string, returnCount: number) {
  const sorted = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const count = (status: IOrder["status"]) => sorted.filter((o) => o.status === status).length;
  const delivered = count("delivered");
  const cancelled = count("cancelled");
  // Cash on delivery: a customer who cancels or refuses more than they
  // accept costs the store a delivery fee each time, so flag it.
  const risk: CustomerRisk =
    sorted.length <= 1 ? "new" : cancelled >= 2 && cancelled >= delivered ? "watch" : "ok";

  return {
    totalOrders: sorted.length,
    delivered,
    cancelled,
    open: sorted.filter((o) => ["pending", "paid", "shipped"].includes(o.status)).length,
    returns: returnCount,
    totalSpent: sorted.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.totalAmount, 0),
    firstOrderAt: sorted[sorted.length - 1]?.createdAt ?? null,
    lastOrderAt: sorted[0]?.createdAt ?? null,
    risk,
    orders: sorted.slice(0, HISTORY_ORDER_LIMIT).map((o) => ({
      _id: o._id.toString(),
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      itemCount: o.items.length,
      isCurrent: o._id.toString() === currentOrderId,
    })),
  };
}
