"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Package, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/controllers/useCartStore";
import * as orderService from "@/services/orderService";
import { formatCurrency } from "@/lib/currency";
import { Order } from "@/models";
import { useTranslations } from "@/controllers/useTranslations";

// Where the server's GET /orders/bkash/callback sends the browser after
// bKash finishes — see server's orderController#bkashCallback. `status` is
// this route's own vocabulary (success/failed/cancelled/error), not
// bKash's raw one, so this stays readable without knowing bKash's API.
export function BkashResultView() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const clearCart = useCartStore((s) => s.clear);
  const { t } = useTranslations();

  useEffect(() => {
    if (status !== "success" || !orderId) return;
    // Only now that payment is actually confirmed — a failed/cancelled
    // attempt leaves the cart alone so there's still something to retry
    // checkout with (see CheckoutView's onSubmit).
    clearCart();
    orderService.getOrderById(orderId).then(setOrder).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, orderId]);

  if (status === "success") {
    return (
      <main className="mx-auto max-w-lg p-6 pb-16 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-3 text-primary" />
        <h1 className="mb-1 text-xl font-semibold">{t("bkash.paymentSuccessful", "Payment successful!")}</h1>
        <p className="mb-6 text-sm text-muted">
          {order
            ? t("bkash.orderPaidSummary", "Order #{id} — {amount}, paid via bKash.", {
                id: order._id.slice(-6).toUpperCase(),
                amount: formatCurrency(order.totalAmount),
              })
            : t("bkash.paymentWentThrough", "Your bKash payment went through.")}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/orders"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Package size={16} /> {t("checkout.viewYourOrders", "View your orders")}
          </Link>
          <Link
            href="/shop"
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background"
          >
            <ShoppingBag size={16} /> {t("checkout.continueShopping", "Continue shopping")}
          </Link>
        </div>
      </main>
    );
  }

  const message =
    status === "cancelled"
      ? t("bkash.cancelled", "You cancelled the bKash payment — nothing was charged, and your cart is still here.")
      : t(
          "bkash.failed",
          "The bKash payment didn't go through — nothing was charged, and your cart is still here."
        );

  return (
    <main className="mx-auto max-w-lg p-6 pb-16 text-center">
      <XCircle size={40} className="mx-auto mb-3 text-red-600" />
      <h1 className="mb-1 text-xl font-semibold">{t("bkash.notCompleted", "Payment not completed")}</h1>
      <p className="mb-6 text-sm text-muted">{message}</p>
      <Link
        href="/checkout"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        {t("bkash.backToCheckout", "Back to checkout")}
      </Link>
    </main>
  );
}
