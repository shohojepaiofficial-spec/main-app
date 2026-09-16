"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { useRequirePermission } from "@/controllers/useRequirePermission";
import * as orderService from "@/services/orderService";
import { formatCurrency } from "@/lib/currency";
import { SITE_NAME } from "@/lib/seo";
import { CONTACT_ADDRESS, CONTACT_PHONE_DISPLAY } from "@/lib/contact";
import { Order } from "@/models";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
};

// A plain, printer-friendly packing slip / invoice — opened in its own tab
// from AdminOrdersView's "Print" button. `print:hidden`/`print:*` classes
// strip the button and card chrome down to just the slip itself when the
// browser's print dialog (Ctrl/Cmd+P, or any printer it's connected to) is
// used; see DashboardSidebar for the matching print:hidden on the sidebar.
export function OrderPrintView({ orderId }: { orderId: string }) {
  const { isChecking, isAllowed } = useRequirePermission("orders:manage");
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isAllowed) return;
    let ignore = false;
    orderService
      .getOrderById(orderId)
      .then((data) => {
        if (ignore) return;
        if (!data) setNotFound(true);
        else setOrder(data);
      })
      .catch(() => {
        if (!ignore) setNotFound(true);
      });
    return () => {
      ignore = true;
    };
  }, [orderId, isAllowed]);

  if (isChecking || !isAllowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Order not found.
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <Printer size={16} /> Print
        </button>
      </div>

      <div className="rounded-md border border-border bg-surface p-8 print:border-none print:p-0">
        <div className="mb-6 flex items-start justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-lg font-semibold">{SITE_NAME}</h1>
            <p className="text-xs text-muted">{CONTACT_ADDRESS}</p>
            <p className="text-xs text-muted">{CONTACT_PHONE_DISPLAY}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Order #{order._id.slice(-6).toUpperCase()}</p>
            <p className="text-xs text-muted">{format(new Date(order.createdAt), "PPP p")}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-muted">Ship to</p>
            <p className="mt-1 font-medium">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.phone}</p>
            <p>
              {order.shippingAddress.addressLine}, {order.shippingAddress.upazila},{" "}
              {order.shippingAddress.zila}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-muted">Payment</p>
            <p className="mt-1">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
            <p className="text-xs capitalize text-muted">{order.status}</p>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Price</th>
              <th className="py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index} className="border-b border-border">
                <td className="py-2">{item.product?.name ?? "Product no longer available"}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                <td className="py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-48 justify-between text-muted">
            <span>Items</span>
            <span>{formatCurrency(order.itemsTotal)}</span>
          </div>
          <div className="flex w-48 justify-between text-muted">
            <span>Delivery</span>
            <span>{order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : "Free"}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex w-48 justify-between text-green-700">
              <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex w-48 justify-between border-t border-border pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
