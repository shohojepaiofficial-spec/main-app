"use client";

import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, Sparkles } from "lucide-react";
import { CustomerHistory } from "@/models";
import { formatCurrency } from "@/lib/currency";
import { ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/orderStatus";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

// The customer's record with the store, beside the order being confirmed.
export function CustomerHistoryCard({ history }: { history: CustomerHistory | null }) {
  if (!history) {
    return <section className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">Customer history unavailable.</section>;
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">Customer history</h2>

      {history.risk === "new" && (
        <p className="mb-3 flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          <Sparkles size={14} /> First order with us. Worth a quick call to confirm.
        </p>
      )}
      {history.risk === "watch" && (
        <p className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          <AlertTriangle size={14} /> {history.cancelled} of {history.totalOrders} orders cancelled. Confirm carefully before booking.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Orders" value={history.totalOrders} />
        <Stat label="Delivered" value={history.delivered} />
        <Stat label="Cancelled" value={history.cancelled} />
        <Stat label="Open" value={history.open} />
        <Stat label="Returns" value={history.returns} />
        <Stat label="Spent" value={formatCurrency(history.totalSpent)} />
      </div>
      {history.firstOrderAt && (
        <p className="mt-2 text-xs text-muted">
          Customer since {format(new Date(history.firstOrderAt), "d MMM yyyy")}
          {history.lastOrderAt && <> &middot; last order {format(new Date(history.lastOrderAt), "d MMM yyyy")}</>}
        </p>
      )}

      {history.orders.length > 1 && (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {history.orders.map((o) => (
            <li key={o._id}>
              <Link
                href={`/admin/orders/${o._id}`}
                aria-current={o.isCurrent ? "page" : undefined}
                className={`flex items-center justify-between gap-2 py-2 text-xs ${o.isCurrent ? "font-semibold" : "hover:text-primary"}`}
              >
                <span>
                  #{o._id.slice(-6).toUpperCase()} &middot; {format(new Date(o.createdAt), "d MMM yyyy")} &middot; {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                  {o.isCurrent && <span className="ml-1 text-muted">(this order)</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${ORDER_STATUS_CLASS[o.status]}`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                  {formatCurrency(o.totalAmount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
