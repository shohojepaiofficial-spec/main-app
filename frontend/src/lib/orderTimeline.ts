import { Order, OrderStatus } from "@/models";

export type TimelineStepKey = "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface TimelineStep {
  key: TimelineStepKey;
  // "done" = passed, "current" = where the order is now, "upcoming" = not yet.
  state: "done" | "current" | "upcoming";
  // When the order reached this step, if known.
  at?: string;
}

// The four steps of a normal order, in order, and the status each one is.
const STEPS: { key: Exclude<TimelineStepKey, "cancelled">; status: OrderStatus }[] = [
  { key: "placed", status: "pending" },
  { key: "confirmed", status: "paid" },
  { key: "shipped", status: "shipped" },
  { key: "delivered", status: "delivered" },
];

type TimelineOrder = Pick<Order, "status" | "createdAt" | "deliveredAt" | "statusHistory">;

// The customer's delivery timeline for one order. Dates come from the
// order's status history; orders placed before that existed only know when
// they were placed and delivered, so their other steps show without a date.
// A step the order skipped (e.g. straight from placed to shipped) counts as
// done. A cancelled order keeps the steps it reached and ends on "cancelled".
export function buildOrderTimeline(order: TimelineOrder): TimelineStep[] {
  const history = order.statusHistory ?? [];
  const reachedAt = (status: OrderStatus) => history.find((entry) => entry.status === status)?.at;
  const dateFor = (status: OrderStatus) =>
    reachedAt(status) ?? (status === "pending" ? order.createdAt : status === "delivered" ? order.deliveredAt : undefined);

  if (order.status === "cancelled") {
    const lastReached = STEPS.reduce((last, step, index) => (reachedAt(step.status) ? index : last), 0);
    return [
      ...STEPS.slice(0, lastReached + 1).map((step) => ({ key: step.key, state: "done" as const, at: dateFor(step.status) })),
      { key: "cancelled", state: "current", at: reachedAt("cancelled") },
    ];
  }

  const position = STEPS.findIndex((step) => step.status === order.status);
  return STEPS.map((step, index) => ({
    key: step.key,
    // Delivered is the end of the line, so it reads as done, not in progress.
    state: index < position || (index === position && step.key === "delivered") ? "done" : index === position ? "current" : "upcoming",
    at: index <= position ? dateFor(step.status) : undefined,
  }));
}
