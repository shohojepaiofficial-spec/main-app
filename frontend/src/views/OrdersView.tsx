"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ChevronRight, Package } from "lucide-react";
import { useMyOrders } from "@/controllers/useMyOrders";
import { useTranslations } from "@/controllers/useTranslations";
import { formatCurrency } from "@/lib/currency";
import { toUploadUrl } from "@/lib/api";
import { ORDER_STATUS_CLASS, customerStatusLabel } from "@/lib/orderStatus";
import { PreorderLineTag } from "@/views/PreorderLineTag";

// Every order on the account, one card each. Tapping one opens its own page
// (/orders/[id]) with the timeline, items, address and actions.
export function OrdersView() {
  const { orders, isLoading } = useMyOrders();
  const { t } = useTranslations();

  return (
    <main className="max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold">{t("orders.yourOrders", "Your orders")}</h1>
      <p className="mb-6 text-sm text-muted">{t("orders.tapForDetails", "Tap an order to see where it is and everything in it.")}</p>

      {isLoading ? (
        <p className="text-sm text-muted">{t("dashboard.loadingYourOrders", "Loading your orders...")}</p>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <Package className="mx-auto mb-2 text-muted" size={28} />
          <p className="mb-3 text-sm text-muted">{t("dashboard.noOrdersYet", "You haven't placed any orders yet.")}</p>
          <Link href="/shop" className="text-sm font-medium text-primary underline">
            {t("dashboard.startShopping", "Start shopping")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const first = order.items[0];
            const more = order.items.length - 1;
            return (
              <li key={order._id}>
                <Link
                  href={`/orders/${order._id}`}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 transition-colors hover:border-primary/50"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-background">
                    {first?.product?.images?.[0] && (
                      <Image src={toUploadUrl(first.product.images[0])} alt={first.product.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {t("dashboard.orderHash", "Order #{id}", { id: order._id.slice(-6).toUpperCase() })}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {first?.product?.name ?? t("orders.productNoLongerAvailable", "Product no longer available")}
                      {more > 0 && ` ${t("orders.andMore", "+{count} more", { count: more })}`}
                    </p>
                    <p className="text-xs text-muted">{format(new Date(order.createdAt), "d MMM yyyy")}</p>
                    {order.isPreorder && <PreorderLineTag preorder={{ shipDate: order.expectedShipDate }} />}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${ORDER_STATUS_CLASS[order.status]}`}>
                      {customerStatusLabel(t, order.status)}
                    </span>
                    <span className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
