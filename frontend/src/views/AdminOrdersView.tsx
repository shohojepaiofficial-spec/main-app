"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Search, ChevronRight, Truck } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminOrders } from "@/controllers/useAdminOrders";
import { AdminOrderFormModal } from "@/views/AdminOrderFormModal";
import { formatCurrency } from "@/lib/currency";
import { formatShipDate } from "@/lib/preorder";
import { Order, OrderStatus } from "@/models";
import { ORDER_STATUS_LABEL as STATUS_LABEL, ORDER_STATUS_CLASS as STATUS_CLASS, ORDER_STATUS_OPTIONS as STATUS_OPTIONS, PAYMENT_LABEL } from "@/lib/orderStatus";

type SortOption = "newest" | "oldest" | "highest" | "lowest";

// One line per order: just enough to scan the list. Everything you can do
// to an order (status, note, courier, returns) is on its own page.
function OrderRow({ order, isSelected, onToggleSelect }: { order: Order; isSelected: boolean; onToggleSelect: () => void }) {
  const courier = order.courierConsignmentId
    ? `${order.courierProvider === "pathao" ? "Pathao" : "Courier"}: ${order.courierTrackingStatus ?? "Booked"}`
    : order.status === "cancelled" || order.status === "delivered" ? null : "Not booked";

  return (
    <div className={`flex items-center gap-3 rounded-md border bg-surface pl-4 transition-colors hover:border-primary/50 ${isSelected ? "border-primary" : "border-border"}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        aria-label={`Select order #${order._id.slice(-6).toUpperCase()}`}
        className="h-4 w-4 shrink-0"
      />
      <Link href={`/admin/orders/${order._id}`} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-3 pr-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            Order #{order._id.slice(-6).toUpperCase()}
            {order.source === "manual" && (
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase text-muted ring-1 ring-border">Manual</span>
            )}
            {order.isPreorder && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                Pre-order{order.expectedShipDate && ` · ships ${formatShipDate(order.expectedShipDate)}`}
              </span>
            )}
            {order.paymentReviewRequired && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-800">Payment review</span>
            )}
          </p>
          <p className="truncate text-xs text-muted">
            {format(new Date(order.createdAt), "d MMM yyyy, h:mm a")} &middot; {order.shippingAddress.fullName} ({order.shippingAddress.phone}) &middot;{" "}
            {order.items.length} item{order.items.length === 1 ? "" : "s"} &middot; {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {courier && (
            <span className="flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted ring-1 ring-border">
              <Truck size={11} /> {courier}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${STATUS_CLASS[order.status]}`}>{STATUS_LABEL[order.status]}</span>
          <span className="w-20 text-right text-sm font-semibold">{formatCurrency(order.totalAmount)}</span>
          <ChevronRight size={16} className="text-muted" />
        </div>
      </Link>
    </div>
  );
}

export function AdminOrdersView() {
  const { isChecking, isAllowed } = useRequirePermission("orders:manage");
  const { orders, isLoading, reload, selectedIds, toggleSelected, selectAll, clearSelection, isBulkUpdating, bulkUpdateStatus } = useAdminOrders();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "preorder" | "regular">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("shipped");

  const filteredOrders = useMemo(() => {
    const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
    // End-of-day so "to" is inclusive of the whole selected day.
    const toTime = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    const result = orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (typeFilter !== "all" && !!order.isPreorder !== (typeFilter === "preorder")) return false;
      const createdAt = new Date(order.createdAt).getTime();
      if (fromTime !== null && createdAt < fromTime) return false;
      if (toTime !== null && createdAt > toTime) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack =
          `${order._id} ${order.shippingAddress.fullName} ${order.shippingAddress.phone}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...result];
    switch (sort) {
      case "oldest":
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "highest":
        sorted.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
      case "lowest":
        sorted.sort((a, b) => a.totalAmount - b.totalAmount);
        break;
      default:
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [orders, statusFilter, typeFilter, search, sort, dateFrom, dateTo]);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const allVisibleSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o._id));

  return (
    <main className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Manage orders</h1>
          <p className="text-sm text-muted">
            Open an order to confirm it, book the courier or change its status.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Plus size={16} /> New order
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order id, name or phone"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | "preorder" | "regular")}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="all">All orders</option>
          <option value="preorder">Pre-orders</option>
          <option value="regular">Regular orders</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest value</option>
          <option value="lowest">Lowest value</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {filteredOrders.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() =>
                allVisibleSelected ? clearSelection() : selectAll(filteredOrders.map((o) => o._id))
              }
              className="h-4 w-4"
            />
            Select all visible
          </label>
          {selectedIds.size > 0 && (
            <>
              <span className="text-muted">{selectedIds.size} selected</span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    Set to {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => bulkUpdateStatus(bulkStatus)}
                disabled={isBulkUpdating}
                className="rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground disabled:opacity-50"
              >
                {isBulkUpdating ? "Applying..." : "Apply"}
              </button>
              <button onClick={clearSelection} className="font-medium text-muted underline">
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Loading orders...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="text-sm text-muted">
          {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredOrders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              isSelected={selectedIds.has(order._id)}
              onToggleSelect={() => toggleSelected(order._id)}
            />
          ))}
        </div>
      )}

      <AdminOrderFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onCreated={reload}
      />

    </main>
  );
}
