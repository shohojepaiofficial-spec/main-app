"use client";

import { format } from "date-fns";
import { RotateCcw, Truck } from "lucide-react";
import { useTranslations } from "@/controllers/useTranslations";
import { formatCurrency } from "@/lib/currency";
import { RETURN_STATUS_LABELS } from "@/lib/returns";
import { ReturnRequest, ReturnStatus } from "@/models";

// What the customer sees next to "rejected" etc. — the next step, in words.
const NEXT_STEP: Record<ReturnStatus, string> = {
  requested: "We're reviewing your request.",
  approved: "Approved. We'll contact you about sending the item back.",
  rejected: "This request wasn't approved.",
  received: "We've received the item and are processing it.",
  completed: "All done.",
};

// A customer's return/exchange requests for one order, under that order in
// My Orders. Renders nothing when there are none.
export function OrderReturnsList({ requests }: { requests: ReturnRequest[] }) {
  const { t } = useTranslations();
  if (requests.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border p-4">
      {requests.map((request) => (
        <div key={request._id} className="rounded-md bg-background p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 font-medium">
              <RotateCcw size={14} className="text-primary" />
              {request.type === "exchange"
                ? t("returns.exchangeRequest", "Exchange request")
                : t("returns.returnRequest", "Return request")}
              <span className="text-xs font-normal text-muted">· {format(new Date(request.createdAt), "PPP")}</span>
            </p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
              request.status === "rejected" ? "bg-border text-muted" : "bg-primary/10 text-primary"
            }`}>
              {t(`returns.status.${request.status}`, RETURN_STATUS_LABELS[request.status])}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {request.items.map((item) => `${item.quantity} × ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""}`).join(", ")}
            {request.exchangeFor && ` → ${request.exchangeFor}`}
          </p>
          <p className="mt-1 text-xs">{t(`returns.next.${request.status}`, NEXT_STEP[request.status])}</p>
          {request.customerMessage && <p className="mt-1 whitespace-pre-line text-xs text-muted">{request.customerMessage}</p>}
          {request.pickup && request.status === "approved" && (
            <div className="mt-2 flex items-start gap-1.5 rounded bg-primary/5 p-2 text-xs">
              <Truck size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p>{t("returns.pickupBooked", "Rider pickup booked — a Pathao rider will collect the item from you. Free of charge.")}</p>
                {request.pickup.courierTrackingStatus && (
                  <p className="mt-0.5 text-muted">
                    {t("returns.pickupStatus", "Pickup status: {status}", { status: request.pickup.courierTrackingStatus })}
                  </p>
                )}
              </div>
            </div>
          )}
          {request.refund && (
            <p className="mt-1 text-xs font-medium">
              {t("returns.refunded", "Refunded {amount} on {date}", {
                amount: formatCurrency(request.refund.amount),
                date: format(new Date(request.refund.refundedAt), "PPP"),
              })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
