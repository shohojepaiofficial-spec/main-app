import type { IOrder } from "../models/Order";

// Plain-language explanation of why an order is on the reconciliation
// dashboard (WORK-11), and which resolutions make sense for it. Pure, so the
// dashboard and its tests agree on the same rules.
export type PaymentIssueKind = "paid_but_cancelled" | "unknown_outcome" | "stale_reservation" | "needs_check";

export function describePaymentIssue(
  order: Pick<IOrder, "status" | "bkashTrxID" | "bkashPaymentID" | "paymentReviewRequired">,
): { kind: PaymentIssueKind; message: string; allowed: ("paid" | "cancelled" | "dismiss")[] } {
  if (order.status === "cancelled" && order.bkashTrxID) {
    return {
      kind: "paid_but_cancelled",
      message: "Money arrived but the order is cancelled. Refund the customer in bKash, then dismiss with the refund reference.",
      allowed: ["dismiss"],
    };
  }
  if (order.status === "pending" && !order.paymentReviewRequired) {
    return {
      kind: "stale_reservation",
      message: order.bkashPaymentID
        ? "The 30-minute payment window ended and the automatic check hasn't settled it. Re-check with bKash."
        : "The customer never reached bKash. Safe to cancel.",
      allowed: ["paid", "cancelled"],
    };
  }
  if (order.status === "pending") {
    return {
      kind: "unknown_outcome",
      message: "bKash hasn't confirmed whether this payment went through. Re-check, or look it up in the merchant portal.",
      allowed: ["paid", "cancelled"],
    };
  }
  return {
    kind: "needs_check",
    message: "The paid amount didn't match the order, or the payment arrived late. Check it in the merchant portal.",
    allowed: ["dismiss"],
  };
}
