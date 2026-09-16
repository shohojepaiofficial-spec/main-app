"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Package, Wallet, XCircle } from "lucide-react";
import { useMyOrders } from "@/controllers/useMyOrders";
import * as orderService from "@/services/orderService";
import { formatCurrency } from "@/lib/currency";
import { toUploadUrl } from "@/lib/api";
import { confirmDialog } from "@/lib/confirm";
import { Modal } from "@/components/ui/Modal";
import { PaymentMethodPicker, PAYMENT_METHODS } from "@/views/PaymentMethodPicker";
import { OrderStatus } from "@/models";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

// Orders still awaiting delivery — the only ones "pay online before
// receiving" makes sense for.
const AWAITING_DELIVERY = new Set<OrderStatus>(["pending", "shipped"]);
const ONLINE_METHODS = PAYMENT_METHODS.filter((m) => m.id !== "cod");

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

// Only "pending" orders can be self-cancelled — once it's "paid"/"shipped"
// it's already being acted on, so cancelling stops being the customer's call
// alone (see server's cancelMyOrder).
const CANCELLABLE = new Set<OrderStatus>(["pending"]);

export function OrdersView() {
  const { orders, isLoading, reload } = useMyOrders();
  const [payOrderId, setPayOrderId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const onCancel = async (orderId: string) => {
    const confirmed = await confirmDialog("Cancel this order? This can't be undone.", {
      title: "Cancel order",
      confirmLabel: "Cancel order",
      danger: true,
    });
    if (!confirmed) return;

    setCancellingId(orderId);
    try {
      await orderService.cancelOrder(orderId);
      toast.success("Order cancelled");
      await reload();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to cancel order"));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Your orders</h1>
      <p className="mb-6 text-sm text-muted">Every order placed on this account.</p>

      {isLoading ? (
        <p className="text-sm text-muted">Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <Package className="mx-auto mb-2 text-muted" size={28} />
          <p className="mb-3 text-sm text-muted">You haven&apos;t placed any orders yet.</p>
          <Link href="/shop" className="text-sm font-medium text-primary underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order._id} className="rounded-md border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                <div>
                  <p className="text-sm font-medium">Order #{order._id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-muted">{format(new Date(order.createdAt), "PPP")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_CLASS[order.status]}`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                  <span className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-background">
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
                      <p className="truncate text-sm font-medium">
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

              <div className="flex flex-col gap-1 border-t border-border p-4 text-sm">
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

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-xs text-muted">
                <span>
                  Shipping to {order.shippingAddress.fullName} ({order.shippingAddress.phone})
                  &mdash; {order.shippingAddress.addressLine}, {order.shippingAddress.upazila},{" "}
                  {order.shippingAddress.zila}
                </span>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {CANCELLABLE.has(order.status) && (
                    <button
                      onClick={() => onCancel(order._id)}
                      disabled={cancellingId === order._id}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={13} />
                      {cancellingId === order._id ? "Cancelling..." : "Cancel order"}
                    </button>
                  )}
                  {order.paymentMethod === "cod" && AWAITING_DELIVERY.has(order.status) && (
                    <button
                      onClick={() => setPayOrderId(order._id)}
                      className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      <Wallet size={13} /> Pay online before receiving
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={payOrderId !== null}
        onClose={() => setPayOrderId(null)}
        title="Pay before receiving"
        widthClassName="max-w-md"
      >
        <p className="mb-4 text-sm text-muted">
          Skip paying cash at the door — settle this order online instead, once one of these is
          switched on:
        </p>
        <PaymentMethodPicker methods={ONLINE_METHODS} />
        <p className="mt-4 text-xs text-muted">
          Online payment isn&apos;t live yet, so for now this order will still be collected as
          Cash on Delivery. We&apos;ll let you know the moment it&apos;s ready.
        </p>
      </Modal>
    </main>
  );
}
