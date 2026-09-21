"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Plus, Printer, ChevronDown, ChevronUp, Search, Phone, MessageCircle } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminOrders } from "@/controllers/useAdminOrders";
import { AdminOrderFormModal } from "@/views/AdminOrderFormModal";
import { OrderCourierPanel } from "@/views/OrderCourierPanel";
import * as orderService from "@/services/orderService";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { toTelLink, toWhatsAppLink } from "@/lib/phone";
import { Order, OrderStatus } from "@/models";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// Rendered in this order everywhere a status picker appears — the natural
// pipeline order, with "Cancelled" last since it's the exception, not a step.
const STATUS_OPTIONS: OrderStatus[] = ["pending", "paid", "shipped", "delivered", "cancelled"];

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
};

type SortOption = "newest" | "oldest" | "highest" | "lowest";

function NoteField({
  order,
  isSaving,
  onSave,
}: {
  order: Order;
  isSaving: boolean;
  onSave: (note: string) => void;
}) {
  const [value, setValue] = useState(order.internalNote ?? "");
  const isDirty = value !== (order.internalNote ?? "");

  return (
    <div className="mt-3 border-t border-border pt-3">
      <label className="mb-1 block text-xs font-medium text-muted" htmlFor={`note-${order._id}`}>
        Internal note (not visible to the customer)
      </label>
      <div className="flex gap-2">
        <textarea
          id={`note-${order._id}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          placeholder="e.g. Asked for evening delivery"
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        {isDirty && (
          <button
            onClick={() => onSave(value)}
            disabled={isSaving}
            className="shrink-0 self-start rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  isUpdating,
  onStatusChange,
  isSelected,
  onToggleSelect,
  noteSavingId,
  onSaveNote,
  courierSavingId,
  onSaveCourier,
  pathaoBookingId,
  onBookPathao,
  pathaoRefreshingId,
  onRefreshPathao,
}: {
  order: Order;
  isUpdating: boolean;
  onStatusChange: (status: OrderStatus) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  noteSavingId: string | null;
  onSaveNote: (note: string) => void;
  courierSavingId: string | null;
  onSaveCourier: (input: orderService.CourierInfoInput) => void;
  pathaoBookingId: string | null;
  onBookPathao: (input: orderService.BookPathaoOrderInput) => Promise<boolean>;
  pathaoRefreshingId: string | null;
  onRefreshPathao: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`rounded-md border bg-surface ${isSelected ? "border-primary" : "border-border"}`}>
      <div className="flex w-full flex-wrap items-center gap-3 p-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Select order #${order._id.slice(-6).toUpperCase()}`}
          className="h-4 w-4 shrink-0"
        />
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex flex-1 flex-wrap items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              Order #{order._id.slice(-6).toUpperCase()}
              {order.source === "manual" && (
                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase text-muted ring-1 ring-border">
                  Manual
                </span>
              )}
              {order.courierConsignmentId && (
                <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase text-muted ring-1 ring-border">
                  Courier booked
                </span>
              )}
            </p>
            <p className="text-xs text-muted">
              {format(new Date(order.createdAt), "PPP")} &middot; {order.shippingAddress.fullName} (
              {order.shippingAddress.phone}) &middot; {order.items.length} item
              {order.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_CLASS[order.status]}`}
            >
              {STATUS_LABEL[order.status]}
            </span>
            <span className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</span>
            {isOpen ? (
              <ChevronUp size={16} className="text-muted" />
            ) : (
              <ChevronDown size={16} className="text-muted" />
            )}
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-border p-4">
          <div className="flex flex-col gap-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-background">
                  {item.product?.images?.[0] && (
                    <Image
                      src={toUploadUrl(item.product.images[0])}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {item.product?.name ?? "Product no longer available"}
                  </p>
                  <p className="text-xs text-muted">
                    Qty {item.quantity} &middot; {formatCurrency(item.price)} each
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Items</span>
              <span>{formatCurrency(order.itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Delivery</span>
              <span>{order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : "Free"}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted">
            <span>
              Shipping to {order.shippingAddress.addressLine}, {order.shippingAddress.upazila},{" "}
              {order.shippingAddress.zila}
              {order.user && (
                <>
                  {" "}
                  &middot; Account: {order.user.name} ({order.user.email})
                </>
              )}
            </span>
            <a
              href={toTelLink(order.shippingAddress.phone)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium hover:bg-background"
            >
              <Phone size={12} /> Call
            </a>
            <a
              href={toWhatsAppLink(order.shippingAddress.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium hover:bg-background"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-muted" htmlFor={`status-${order._id}`}>
              Status
            </label>
            <select
              id={`status-${order._id}`}
              value={order.status}
              disabled={isUpdating}
              onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              Payment: {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
            </span>
            <Link
              href={`/admin/orders/${order._id}/print`}
              target="_blank"
              className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
            >
              <Printer size={13} /> Print
            </Link>
          </div>

          <NoteField order={order} isSaving={noteSavingId === order._id} onSave={onSaveNote} />

          <OrderCourierPanel
            order={order}
            isSavingCourier={courierSavingId === order._id}
            isBooking={pathaoBookingId === order._id}
            isRefreshing={pathaoRefreshingId === order._id}
            onSaveManual={onSaveCourier}
            onBook={onBookPathao}
            onRefresh={onRefreshPathao}
          />
        </div>
      )}
    </div>
  );
}

export function AdminOrdersView() {
  const { isChecking, isAllowed } = useRequirePermission("orders:manage");
  const {
    orders,
    isLoading,
    updatingId,
    updateStatus,
    reload,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    isBulkUpdating,
    bulkUpdateStatus,
    noteSavingId,
    saveNote,
    courierSavingId,
    saveCourierInfo,
    pathaoBookingId,
    bookWithPathao,
    pathaoRefreshingId,
    refreshPathaoStatus,
  } = useAdminOrders();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
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
  }, [orders, statusFilter, search, sort, dateFrom, dateTo]);

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
            Track and update every order, or add one placed by phone.
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
              isUpdating={updatingId === order._id}
              onStatusChange={(status) => updateStatus(order._id, status)}
              isSelected={selectedIds.has(order._id)}
              onToggleSelect={() => toggleSelected(order._id)}
              noteSavingId={noteSavingId}
              onSaveNote={(note) => saveNote(order._id, note)}
              courierSavingId={courierSavingId}
              onSaveCourier={(input) => saveCourierInfo(order._id, input)}
              pathaoBookingId={pathaoBookingId}
              onBookPathao={(input) => bookWithPathao(order._id, input)}
              pathaoRefreshingId={pathaoRefreshingId}
              onRefreshPathao={() => refreshPathaoStatus(order._id)}
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
