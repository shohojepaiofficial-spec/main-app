"use client";

import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { buildOrderTimeline, TimelineStepKey } from "@/lib/orderTimeline";
import { useTranslations } from "@/controllers/useTranslations";
import { Order } from "@/models";

const STEP_LABELS: Record<TimelineStepKey, string> = {
  placed: "Order placed",
  confirmed: "Confirmed",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Where one order is on its way to the customer: placed → confirmed → on
// the way → delivered, with the date each step was reached.
export function OrderTimeline({ order }: { order: Pick<Order, "status" | "createdAt" | "deliveredAt" | "statusHistory"> }) {
  const { t } = useTranslations();
  const steps = buildOrderTimeline(order);

  return (
    <ol aria-label={t("orderTimeline.label", "Order progress")} className="flex border-b border-border px-4 py-4">
      {steps.map((step, index) => {
        const cancelled = step.key === "cancelled";
        const reached = step.state !== "upcoming";
        return (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {/* The line back to the previous step. */}
            {index > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${reached && !cancelled ? "bg-primary" : "bg-border"}`}
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold ${
                cancelled
                  ? "border-red-600 bg-red-600 text-white"
                  : step.state === "done"
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.state === "current"
                      ? "border-primary bg-surface text-primary"
                      : "border-border bg-surface text-muted"
              }`}
            >
              {cancelled ? <X size={12} aria-hidden /> : step.state === "done" ? <Check size={12} aria-hidden /> : index + 1}
            </span>
            <span className={`mt-1.5 text-xs font-medium ${cancelled ? "text-red-600" : reached ? "text-foreground" : "text-muted"}`}>
              {t(`orderTimeline.${step.key}`, STEP_LABELS[step.key])}
            </span>
            {step.at && <span className="text-[11px] text-muted">{format(new Date(step.at), "d MMM, p")}</span>}
          </li>
        );
      })}
    </ol>
  );
}
