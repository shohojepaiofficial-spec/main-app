"use client";

import { format } from "date-fns";
import { RefreshCw, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Order } from "@/models";

// The courier booking and every status it has had, newest first: Pathao's
// booking reply and each changed status from a refresh, plus any typed in
// by hand. Staff only.
export function CourierTrackingCard({
  order,
  isRefreshing,
  onRefresh,
}: {
  order: Order;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const events = [...(order.courierEvents ?? [])].reverse();
  const isPathao = order.courierProvider === "pathao" && events.some((e) => e.source === "pathao");

  return (
    <div className="mt-5 rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Truck size={15} /> Courier tracking
        </p>
        {isPathao && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium hover:bg-background disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} /> Refresh Pathao
          </button>
        )}
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="text-muted">Consignment</dt><dd className="font-medium break-all">{order.courierConsignmentId}</dd></div>
        <div><dt className="text-muted">Latest status</dt><dd className="font-medium">{order.courierTrackingStatus ?? "Unknown"}</dd></div>
        {order.courierDeliveryFee !== undefined && (
          <div><dt className="text-muted">Pathao fee</dt><dd className="font-medium">{formatCurrency(order.courierDeliveryFee)}</dd></div>
        )}
        {order.courierCheckedAt && (
          <div><dt className="text-muted">Last checked</dt><dd className="font-medium">{format(new Date(order.courierCheckedAt), "d MMM, h:mm a")}</dd></div>
        )}
      </dl>
      {order.courierNote && <p className="mt-2 text-xs text-muted">Note: {order.courierNote}</p>}

      {events.length > 0 && (
        <ol className="mt-3 border-l-2 border-border pl-4">
          {events.map((event, index) => (
            <li key={`${event.at}-${index}`} className="relative pb-3 last:pb-0">
              <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-primary ring-4 ring-primary/20" : "bg-border"}`} />
              <p className={`text-xs ${index === 0 ? "font-semibold" : "font-medium"}`}>{event.status}</p>
              <p className="text-[11px] text-muted">
                {format(new Date(event.at), "d MMM yyyy, h:mm a")} &middot;{" "}
                {event.kind === "booked" ? "booked with Pathao" : event.kind === "webhook" ? "sent by Pathao" : event.kind === "refresh" ? "from Pathao" : "entered by hand"}
                {event.byName && <> by {event.byName}</>}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
