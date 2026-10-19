"use client";

import Image from "next/image";
import { Gift, CheckCircle2, MapPin, Smartphone, XCircle } from "lucide-react";
import { usePayForSharedCart } from "@/controllers/usePayForSharedCart";
import { useTranslations } from "@/controllers/useTranslations";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { SharedCart } from "@/models";
import { PreorderLineTag } from "@/views/PreorderLineTag";

// A payment link: what someone asked you to pay for, where it's going, and
// one "Pay with bKash" button. No sign-in. `result` is bKash's outcome when
// it sends the payer back here.
export function PaySharedCartView({ sharedCart, result }: { sharedCart: SharedCart; result?: string }) {
  const { t } = useTranslations();
  const { isPaying, pay } = usePayForSharedCart(sharedCart.link);
  const { totals, deliverTo } = sharedCart;
  const itemsTotal = sharedCart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const paid = sharedCart.isFulfilled || result === "success";

  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-[calc(var(--navbar-height)+2rem)] sm:px-6">
      <div className="mb-6 text-center">
        <Gift size={32} className="mx-auto mb-2 text-primary" aria-hidden="true" />
        <h1 className="text-xl font-semibold">
          {t("pay.wantsYouToPay", "{name} wants you to pay for this", { name: sharedCart.createdByName })}
        </h1>
        {!paid && (
          <p className="mt-1 text-sm text-muted">
            {t("pay.payWithBkashBelow", "Check the order below and pay with bKash. No account needed.")}
          </p>
        )}
      </div>

      {paid ? (
        <div className="rounded-md border border-border bg-surface p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-green-600" aria-hidden="true" />
          <p className="text-sm font-medium">
            {result === "success"
              ? t("pay.thanksPaid", "Payment received — thank you! {name} will get the order.", { name: sharedCart.createdByName })
              : t("pay.alreadyPaid", "This has already been paid for.")}
          </p>
        </div>
      ) : (
        <>
          {(result === "failed" || result === "error") && (
            <p className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <XCircle size={16} className="shrink-0" aria-hidden="true" />
              {t("pay.paymentFailed", "The payment didn't go through. You weren't charged — you can try again.")}
            </p>
          )}

          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex flex-col gap-3">
              {sharedCart.items.map((item) => (
                <div key={`${item.productId}:${item.variantId ?? ""}`} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-background">
                    {item.image && <Image src={toUploadUrl(item.image)} alt={item.name} fill className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.name}</p>
                    {item.variantLabel && <p className="text-xs text-muted">{item.variantLabel}</p>}
                    {item.preorder && <PreorderLineTag preorder={item.preorder} />}
                    <p className="text-xs text-muted">{t("checkout.qty", "Qty {n}", { n: item.quantity })}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <dl className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">{t("pay.itemsTotal", "Items total")}</dt>
                <dd>{formatCurrency(totals?.itemsTotal ?? itemsTotal)}</dd>
              </div>
              {totals && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted">{t("pay.delivery", "Delivery")}</dt>
                    <dd>{formatCurrency(totals.deliveryFee)}</dd>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted">{t("pay.discount", "Discount")}</dt>
                      <dd>−{formatCurrency(totals.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <dt>{t("pay.toPay", "To pay")}</dt>
                    <dd>{formatCurrency(totals.totalAmount)}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {deliverTo && (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-sm">
              <MapPin size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <span>{t("pay.deliversTo", "Delivers to {name}, {area}", { name: deliverTo.fullName, area: deliverTo.area })}</span>
            </p>
          )}

          {!deliverTo ? (
            <p className="mt-4 text-center text-sm text-muted">
              {t("pay.linkOutdated", "This link is out of date. Ask {name} for a new one.", { name: sharedCart.createdByName })}
            </p>
          ) : !totals ? (
            <p className="mt-4 text-center text-sm text-muted">
              {t("pay.cantBuyNow", "Some of these items aren't available any more. Ask {name} for a new link.", { name: sharedCart.createdByName })}
            </p>
          ) : !sharedCart.bkashAvailable ? (
            <div className="mt-4 rounded-md border border-border bg-surface p-4 text-center">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                {t("pay.comingSoon", "Coming soon")}
              </span>
              <p className="mt-2 text-sm text-muted">
                {t("pay.bkashComingSoon", "bKash payment is coming soon. Please check back in a few days.")}
              </p>
            </div>
          ) : (
            <button
              onClick={pay}
              disabled={isPaying}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#E2136E] px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Smartphone size={16} aria-hidden="true" />
              {isPaying
                ? t("pay.openingBkash", "Opening bKash...")
                : t("pay.payWithBkash", "Pay {amount} with bKash", { amount: formatCurrency(totals.totalAmount) })}
            </button>
          )}
        </>
      )}
    </main>
  );
}
