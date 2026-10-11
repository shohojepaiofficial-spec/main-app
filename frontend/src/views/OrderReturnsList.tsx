"use client";

import { format } from "date-fns";
import { RotateCcw } from "lucide-react";
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
