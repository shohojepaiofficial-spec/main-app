import type { ReturnReason, ReturnRequestInput, ReturnStatus, ReturnType, RefundMethod } from "@/models";

// Pure helpers shared by the customer return form and the admin Returns page.
// The server (utils/returns.ts) is the authority; these only give friendlier
// messages before a round trip.

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  damaged: "Arrived damaged or faulty",
  wrong_item: "Wrong item sent",
  size_fit: "Size or fit isn't right",
  not_as_described: "Not as described",
  changed_mind: "Changed my mind",
  other: "Something else",
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Not approved",
  received: "Received",
  completed: "Completed",
};

export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  bkash: "bKash (automatic)",
  bkash_personal: "bKash (sent by hand)",
  nagad_personal: "Nagad (sent by hand)",
  cash: "Cash",
  bank: "Bank transfer",
  other: "Other",
};

export interface ReturnFormState {
  type: ReturnType;
  reason: ReturnReason | "";
  details: string;
  exchangeFor: string;
  // Units to send back, per order line (same index as Order.items).
  quantities: number[];
}

// Returns an error message, or the request body ready to send.
export function toReturnRequestInput(
  orderId: string,
  form: ReturnFormState,
  remaining: number[]
): { error: string } | { input: ReturnRequestInput } {
  const items = form.quantities
    .map((quantity, orderItemIndex) => ({ orderItemIndex, quantity }))
    .filter((item) => item.quantity > 0);
  if (items.length === 0) return { error: "Pick at least one item" };
  if (items.some((item) => item.quantity > (remaining[item.orderItemIndex] ?? 0))) {
    return { error: "You've picked more than you can return" };
  }
  if (!form.reason) return { error: "Choose a reason" };
  if (form.type === "exchange" && !form.exchangeFor.trim()) {
    return { error: "Tell us what you'd like instead" };
  }
  return {
    input: {
      orderId,
      type: form.type,
      reason: form.reason,
      details: form.details.trim() || undefined,
      exchangeFor: form.type === "exchange" ? form.exchangeFor.trim() : undefined,
      items,
    },
  };
}

// The refund form's starting amount: what the returned units cost, never
// more than the order has left to refund.
export function suggestedRefund(itemsValue: number, refundableRemaining: number): number {
  return Math.max(0, Math.min(itemsValue, refundableRemaining));
}
