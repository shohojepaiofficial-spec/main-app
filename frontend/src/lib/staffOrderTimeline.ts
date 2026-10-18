import { Order, OrderStatus } from "@/models";

// The staff view of an order's progress: the customer's four steps plus the
// courier booking, each with the work staff do at that step. The order
// detail page (views/StaffOrderTimeline.tsx) puts the matching action button
// on the current step.
export type StaffStepKey = "placed" | "confirmed" | "booked" | "shipped" | "delivered" | "cancelled";

export interface StaffTimelineStep {
  key: StaffStepKey;
  label: string;
  // "done" = finished, "current" = waiting on staff now, "upcoming" = later,
  // "skipped" = never reached because the order was cancelled.
  state: "done" | "current" | "upcoming" | "skipped";
  at?: string;
  by?: string;
  task: string;
}

type TimelineOrder = Pick<
  Order,
  "status" | "createdAt" | "deliveredAt" | "statusHistory" | "paymentMethod" | "courierConsignmentId" | "courierBookedAt"
>;

const REACHED_BY: Record<OrderStatus, OrderStatus[]> = {
  pending: ["pending", "paid", "shipped", "delivered"],
  paid: ["paid", "shipped", "delivered"],
  shipped: ["shipped", "delivered"],
  delivered: ["delivered"],
  cancelled: [],
};

export function buildStaffOrderTimeline(order: TimelineOrder): StaffTimelineStep[] {
  const history = order.statusHistory ?? [];
  const entry = (status: OrderStatus) => history.find((e) => e.status === status);
  // Reached either now (the status moved past it) or before a cancellation.
  const reached = (status: OrderStatus) => REACHED_BY[status].includes(order.status) || !!entry(status);
  const bkash = order.paymentMethod === "bkash";

  const steps: Omit<StaffTimelineStep, "state">[] = [
    {
      key: "placed", label: "Order placed", at: entry("pending")?.at ?? order.createdAt,
      task: "Check the address and the customer's history, then WhatsApp or call to confirm.",
    },
    {
      key: "confirmed", label: bkash ? "Payment received" : "Confirmed", at: entry("paid")?.at, by: entry("paid")?.byName,
      task: bkash ? "Confirmed automatically once bKash payment arrives." : "Once the customer confirms, mark the order confirmed.",
    },
    {
      key: "booked", label: "Booked with courier", at: order.courierBookedAt,
      task: "Pack the parcel and book it with Pathao (or enter the courier details).",
    },
    {
      key: "shipped", label: "Handed to courier", at: entry("shipped")?.at, by: entry("shipped")?.byName,
      task: "When the rider picks it up, mark it shipped. Refresh Pathao for the latest status.",
    },
    {
      key: "delivered", label: "Delivered", at: entry("delivered")?.at ?? order.deliveredAt, by: entry("delivered")?.byName,
      task: "When Pathao shows it delivered and the cash is collected, mark it delivered.",
    },
  ];

  const done: Record<string, boolean> = {
    placed: true,
    confirmed: reached("paid"),
    booked: !!order.courierConsignmentId,
    shipped: reached("shipped"),
    delivered: reached("delivered"),
  };

  if (order.status === "cancelled") {
    const cancelled = entry("cancelled");
    return [
      ...steps.map((step) => ({ ...step, state: done[step.key] ? ("done" as const) : ("skipped" as const) })),
      { key: "cancelled", label: "Cancelled", state: "done", at: cancelled?.at, by: cancelled?.byName, task: "Stock was put back automatically." },
    ];
  }

  const currentIndex = steps.findIndex((step) => !done[step.key]);
  return steps.map((step, index) => ({
    ...step,
    state: done[step.key] ? "done" : index === currentIndex ? "current" : "upcoming",
  }));
}
