"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft, MessageCircle, Phone, Printer, RefreshCw, Truck, PackageCheck, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import { useAdminOrderDetail } from "@/controllers/useAdminOrderDetail";
import { openWhatsAppDirect } from "@/lib/whatsapp";
import { buildStaffOrderTimeline, StaffTimelineStep } from "@/lib/staffOrderTimeline";
import { ORDER_STATUS_CLASS, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/orderStatus";
import { toTelLink, toOrderWhatsAppLink } from "@/lib/phone";
import { formatCurrency } from "@/lib/currency";
import { formatShipDate } from "@/lib/preorder";
import { toUploadUrl } from "@/lib/api";
import { confirmDialog } from "@/lib/confirm";
import { SITE_NAME } from "@/lib/seo";
import { Order } from "@/models";
import { StaffOrderTimeline } from "@/views/StaffOrderTimeline";
import { CustomerHistoryCard } from "@/views/CustomerHistoryCard";
import { OrderCourierPanel } from "@/views/OrderCourierPanel";
import { OrderNoteField } from "@/views/OrderNoteField";
import { ReturnRequestModal } from "@/views/ReturnRequestModal";
import { CourierTrackingCard } from "@/views/CourierTrackingCard";

const orderNumber = (order: Order) => `#${order._id.slice(-6).toUpperCase()}`;

function whatsAppMessage(order: Order) {
  const items = order.items.map((i) => `${i.product?.name ?? "Item"}${i.variantLabel ? ` (${i.variantLabel})` : ""} x${i.quantity}`).join(", ");
  const payment = order.paymentMethod === "cod" ? `${formatCurrency(order.totalAmount)}, cash on delivery` : formatCurrency(order.totalAmount);
  const { addressLine, upazila, zila } = order.shippingAddress;
  return `Assalamu alaikum ${order.shippingAddress.fullName}, this is ${SITE_NAME} about your order ${orderNumber(order)}: ${items}. Total ${payment}. Delivery to ${addressLine}, ${upazila}, ${zila}. Please reply to confirm.`;
}

const buttonClass = "inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50";

// Staff order page: what was ordered, who the customer is (and their record
// with us), and a timeline from placed to delivered with the next action on it.
export function AdminOrderDetailView({ orderId }: { orderId: string }) {
  const { isChecking, isAllowed } = useRequirePermission("orders:manage");
  const detail = useAdminOrderDetail(orderId, isAllowed);
  const { order, history } = detail;
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  if (isChecking || !isAllowed || detail.isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">Loading order...</div>;
  }
  if (detail.notFound || !order) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted">
        Order not found.
        <Link href="/admin/orders" className="font-medium text-primary hover:underline">Back to Manage Orders</Link>
      </div>
    );
  }

  const steps = buildStaffOrderTimeline(order);
  const isOpen = order.status !== "delivered" && order.status !== "cancelled";
  const bkashUnpaid = order.paymentMethod === "bkash" && order.status === "pending";

  const cancel = async () => {
    const ok = await confirmDialog(`Cancel order ${orderNumber(order)}? Its stock goes back and the customer is told.`, {
      title: "Cancel order", confirmLabel: "Cancel order", cancelLabel: "Keep order", danger: true,
    });
    if (ok) detail.updateStatus("cancelled");
  };

  const renderAction = (step: StaffTimelineStep) => {
    switch (step.key) {
      case "confirmed":
        return bkashUnpaid ? (
          <p className="text-xs text-muted">Waiting for bKash payment.</p>
        ) : (
          <button onClick={() => detail.updateStatus("paid")} disabled={detail.isUpdatingStatus} className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary-hover`}>
            <CheckCircle2 size={16} /> Mark confirmed
          </button>
        );
      case "booked":
        return (
          <OrderCourierPanel
            order={order}
            isSavingCourier={detail.isSavingCourier}
            isBooking={detail.isBooking}
            isRefreshing={detail.isRefreshing}
            onSaveManual={detail.saveCourierInfo}
            onBook={detail.bookWithPathao}
            onRefresh={detail.refreshPathaoStatus}
            onRemove={detail.removeCourierBooking}
          />
        );
      case "shipped":
      case "delivered":
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => detail.updateStatus(step.key === "shipped" ? "shipped" : "delivered")}
              disabled={detail.isUpdatingStatus}
              className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary-hover`}
            >
              {step.key === "shipped" ? <Truck size={16} /> : <PackageCheck size={16} />}
              {step.key === "shipped" ? "Mark shipped" : "Mark delivered"}
            </button>
            {order.courierConsignmentId && order.courierProvider === "pathao" && (
              <button onClick={detail.refreshPathaoStatus} disabled={detail.isRefreshing} className={`${buttonClass} border border-border hover:bg-background`}>
                <RefreshCw size={14} className={detail.isRefreshing ? "animate-spin" : ""} /> Refresh Pathao
              </button>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-4 pb-16 sm:p-6">
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> Manage Orders
      </Link>

      {/* Top bar */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            Order {orderNumber(order)}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${ORDER_STATUS_CLASS[order.status]}`}>
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {format(new Date(order.createdAt), "d MMM yyyy, h:mm a")} &middot; {formatCurrency(order.totalAmount)} &middot;{" "}
            {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
            {order.source === "manual" && <> &middot; entered by staff</>}
            {order.isPreorder && <> &middot; pre-order{order.expectedShipDate && `, ships ${formatShipDate(order.expectedShipDate)}`}</>}
          </p>
          {order.paymentReviewRequired && (
            <Link href="/admin/payments" className="mt-1 inline-block text-xs font-semibold text-amber-700 hover:underline">
              Payment needs review before fulfillment or refund
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={toOrderWhatsAppLink(order.shippingAddress.phone, whatsAppMessage(order))} target="_blank" rel="noopener noreferrer" onClick={openWhatsAppDirect} className={`${buttonClass} bg-[#25D366] text-white hover:opacity-90`}>
            <MessageCircle size={16} /> WhatsApp
          </a>
          <a href={toTelLink(order.shippingAddress.phone)} className={`${buttonClass} border border-border hover:bg-background`}>
            <Phone size={16} /> Call
          </a>
          <Link href={`/admin/orders/${order._id}/print`} target="_blank" className={`${buttonClass} border border-border hover:bg-background`}>
            <Printer size={16} /> Print
          </Link>
          {order.status === "delivered" && (
            <button onClick={() => setIsReturnOpen(true)} className={`${buttonClass} border border-border hover:bg-background`}>
              <RotateCcw size={16} /> Log return / exchange
            </button>
          )}
          {isOpen && !bkashUnpaid && (
            <button onClick={cancel} disabled={detail.isUpdatingStatus} className={`${buttonClass} border border-red-200 text-red-700 hover:bg-red-50`}>
              <XCircle size={16} /> Cancel
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-4 text-sm font-semibold">Progress</h2>
            <StaffOrderTimeline steps={steps} renderAction={renderAction} />
            {order.courierConsignmentId && (
              <CourierTrackingCard order={order} isRefreshing={detail.isRefreshing} onRefresh={detail.refreshPathaoStatus} />
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Items</h2>
            <ul className="flex flex-col gap-3">
              {order.items.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-background">
                    {item.product?.images?.[0] && (
                      <Image src={toUploadUrl(item.product.images[0])} alt={item.product.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.product?.name ?? "Product no longer available"}</p>
                    <p className="text-xs text-muted">
                      {item.variantLabel && <>{item.variantLabel} &middot; </>}
                      {item.sku && <>SKU {item.sku} &middot; </>}
                      Qty {item.quantity} &middot; {formatCurrency(item.price)} each
                      {item.isPreorder && <span className="ml-1 font-medium text-primary">Pre-order</span>}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted"><dt>Items</dt><dd>{formatCurrency(order.itemsTotal)}</dd></div>
              <div className="flex justify-between text-muted"><dt>Delivery</dt><dd>{order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : "Free"}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-700"><dt>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</dt><dd>-{formatCurrency(order.discount)}</dd></div>
              )}
              {(order.preorderDiscount ?? 0) > 0 && (
                <div className="flex justify-between text-green-700"><dt>Pre-order discount</dt><dd>-{formatCurrency(order.preorderDiscount!)}</dd></div>
              )}
              <div className="flex justify-between font-semibold"><dt>{order.paymentMethod === "cod" ? "To collect" : "Total"}</dt><dd>{formatCurrency(order.totalAmount)}</dd></div>
            </dl>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-border bg-surface p-4 text-sm">
            <h2 className="mb-2 text-sm font-semibold">Deliver to</h2>
            <p className="font-medium">{order.shippingAddress.fullName}</p>
            <p className="text-muted">{order.shippingAddress.phone}</p>
            <p className="mt-1 text-muted">
              {order.shippingAddress.addressLine}, {order.shippingAddress.upazila}, {order.shippingAddress.zila}
            </p>
            {order.user && <p className="mt-2 text-xs text-muted">Account: {order.user.name} ({order.user.email})</p>}
            <OrderNoteField order={order} isSaving={detail.isSavingNote} onSave={detail.saveNote} />
          </section>
          <CustomerHistoryCard history={history} />
        </aside>
      </div>
      <ReturnRequestModal
        order={isReturnOpen ? order : null}
        // The server subtracts units already claimed by other requests.
        remaining={order.items.map((item) => item.quantity)}
        asStaff
        onClose={() => setIsReturnOpen(false)}
        onSubmitted={() => setIsReturnOpen(false)}
      />
    </main>
  );
}
