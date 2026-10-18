"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft, MapPin, MessageCircle, Printer, RotateCcw, Wallet, XCircle } from "lucide-react";
import { useMyOrder } from "@/controllers/useMyOrder";
import { useMyReturns } from "@/controllers/useMyReturns";
import { useTranslations } from "@/controllers/useTranslations";
import { formatCurrency } from "@/lib/currency";
import { toUploadUrl } from "@/lib/api";
import { WHATSAPP_NUMBER } from "@/lib/contact";
import { toOrderWhatsAppLink } from "@/lib/phone";
import { ORDER_STATUS_CLASS, customerStatusLabel } from "@/lib/orderStatus";
import { Modal } from "@/components/ui/Modal";
import { PaymentMethodPicker, PAYMENT_METHODS } from "@/views/PaymentMethodPicker";
import { PreorderLineTag } from "@/views/PreorderLineTag";
import { ReturnRequestModal } from "@/views/ReturnRequestModal";
import { OrderReturnsList } from "@/views/OrderReturnsList";
import { OrderTimeline } from "@/views/OrderTimeline";
import { Order } from "@/models";

const ONLINE_METHODS = PAYMENT_METHODS.filter((m) => m.id !== "cod");
const orderNumber = (order: Order) => order._id.slice(-6).toUpperCase();

// The customer's own order, on its own page: where it is, what's in it,
// where it's going, and what they can do (cancel while pending, pay online,
// return after delivery, message the store).
export function MyOrderDetailView({ orderId }: { orderId: string }) {
  const { order, isLoading, notFound, isCancelling, cancel } = useMyOrder(orderId);
  const { requestsByOrder, eligibilityByOrder, windowDays, reload: reloadReturns } = useMyReturns();
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const { t } = useTranslations();

  if (isLoading) {
    return <p className="p-6 text-sm text-muted">{t("orders.loadingOrder", "Loading your order...")}</p>;
  }
  if (notFound || !order) {
    return (
      <main className="p-6">
        <p className="mb-3 text-sm text-muted">{t("orders.orderNotFound", "We couldn't find this order on your account.")}</p>
        <Link href="/orders" className="text-sm font-medium text-primary underline">
          {t("orders.backToOrders", "Back to your orders")}
        </Link>
      </main>
    );
  }

  const { fullName, phone, addressLine, upazila, zila } = order.shippingAddress;
  const helpMessage = t("orders.whatsappHelpMessage", "Hi, I need help with my order #{id}.", { id: orderNumber(order) });
  const awaitingDelivery = order.status === "pending" || order.status === "shipped";

  return (
    <main className="max-w-3xl p-4 pb-16 sm:p-6">
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> {t("orders.backToOrders", "Back to your orders")}
      </Link>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("dashboard.orderHash", "Order #{id}", { id: orderNumber(order) })}</h1>
          <p className="text-sm text-muted">
            {t("orders.placedOn", "Placed {date}", { date: format(new Date(order.createdAt), "d MMM yyyy, h:mm a") })}
          </p>
          {order.isPreorder && <PreorderLineTag preorder={{ shipDate: order.expectedShipDate }} />}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${ORDER_STATUS_CLASS[order.status]}`}>
          {customerStatusLabel(t, order.status)}
        </span>
      </header>

      <section className="mb-4 rounded-lg border border-border bg-surface">
        <h2 className="px-4 pt-4 text-sm font-semibold">{t("orders.whereIsMyOrder", "Where your order is")}</h2>
        <OrderTimeline order={order} />
        {order.paymentMethod === "cod" && awaitingDelivery && (
          <p className="border-t border-border px-4 py-3 text-sm">
            {t("orders.keepCashReady", "Please keep {amount} ready for the delivery rider.", { amount: formatCurrency(order.totalAmount) })}
          </p>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-border bg-surface">
        <h2 className="px-4 pt-4 text-sm font-semibold">{t("orders.whatYouOrdered", "What you ordered")}</h2>
        <ul className="flex flex-col gap-3 p-4">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-background">
                {item.product?.images?.[0] && (
                  <Image src={toUploadUrl(item.product.images[0])} alt={item.product.name} fill className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.product?.name ?? t("orders.productNoLongerAvailable", "Product no longer available")}
                </p>
                {item.variantLabel && <p className="text-xs text-muted">{item.variantLabel}</p>}
                {item.isPreorder && <p className="text-xs font-medium text-primary">{t("product.preorderLabel", "Pre-order")}</p>}
                <p className="text-xs text-muted">
                  {t("orders.qtyEach", "Qty {quantity} · {price} each", { quantity: item.quantity, price: formatCurrency(item.price) })}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-border p-4 text-sm">
          <div className="flex justify-between text-muted"><dt>{t("cart.items", "Items")}</dt><dd>{formatCurrency(order.itemsTotal)}</dd></div>
          <div className="flex justify-between text-muted">
            <dt>{t("checkout.delivery", "Delivery")}</dt>
            <dd>{order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : t("common.free", "Free")}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>{order.promoCode ? t("checkout.discountWithCode", "Discount ({code})", { code: order.promoCode }) : t("cart.discount", "Discount")}</dt>
              <dd>-{formatCurrency(order.discount)}</dd>
            </div>
          )}
          {(order.preorderDiscount ?? 0) > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>{t("checkout.preorderDiscount", "Pre-order discount")}</dt>
              <dd>-{formatCurrency(order.preorderDiscount!)}</dd>
            </div>
          )}
          <div className="flex justify-between font-semibold"><dt>{t("cart.total", "Total")}</dt><dd>{formatCurrency(order.totalAmount)}</dd></div>
          <p className="text-xs text-muted">
            {order.paymentMethod === "cod" ? t("orders.payingCashOnDelivery", "Paying cash on delivery") : t("orders.paidOnline", "Paid online with bKash")}
          </p>
        </dl>
        <OrderReturnsList requests={requestsByOrder.get(order._id) ?? []} />
      </section>

      <section className="mb-4 rounded-lg border border-border bg-surface p-4 text-sm">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <MapPin size={15} /> {t("orders.deliveringTo", "Delivering to")}
        </h2>
        <p className="font-medium">{fullName}</p>
        <p className="text-muted">{phone}</p>
        <p className="text-muted">{addressLine}, {upazila}, {zila}</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <a
          href={toOrderWhatsAppLink(WHATSAPP_NUMBER, helpMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <MessageCircle size={16} /> {t("orders.helpOnWhatsapp", "Help on WhatsApp")}
        </a>
        {order.status === "pending" && (
          <button
            onClick={cancel}
            disabled={isCancelling}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle size={16} /> {isCancelling ? t("orders.cancelling", "Cancelling...") : t("orders.cancelOrder", "Cancel order")}
          </button>
        )}
        {eligibilityByOrder.has(order._id) && (
          <button
            onClick={() => setIsReturnOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-background"
          >
            <RotateCcw size={16} /> {t("returns.requestButton", "Return or exchange")}
          </button>
        )}
        {order.paymentMethod === "cod" && awaitingDelivery && (
          <button
            onClick={() => setIsPayOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <Wallet size={16} /> {t("orders.payOnlineBeforeReceiving", "Pay online before receiving")}
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-background print:hidden"
        >
          <Printer size={16} /> {t("orders.print", "Print")}
        </button>
      </div>

      <ReturnRequestModal
        order={isReturnOpen ? order : null}
        remaining={eligibilityByOrder.get(order._id)?.remaining ?? []}
        windowDays={windowDays}
        onClose={() => setIsReturnOpen(false)}
        onSubmitted={() => {
          setIsReturnOpen(false);
          reloadReturns();
        }}
      />

      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title={t("orders.payBeforeReceiving", "Pay before receiving")}
        widthClassName="max-w-md"
        guardUnsavedChanges={false}
      >
        <p className="mb-4 text-sm text-muted">
          {t("orders.skipCashAtDoor", "Skip paying cash at the door — settle this order online instead, once one of these is switched on:")}
        </p>
        <PaymentMethodPicker methods={ONLINE_METHODS} />
        <p className="mt-4 text-xs text-muted">
          {t(
            "orders.onlinePaymentNotLive",
            "Online payment isn't live yet, so for now this order will still be collected as Cash on Delivery. We'll let you know the moment it's ready."
          )}
        </p>
      </Modal>
    </main>
  );
}
