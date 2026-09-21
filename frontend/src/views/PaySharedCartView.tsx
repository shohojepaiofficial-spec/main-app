"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Gift, CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/controllers/useCartStore";
import { useAuthController } from "@/controllers/useAuthController";
import { useUIStore } from "@/controllers/useUIStore";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { SharedCart } from "@/models";
import { useTranslations } from "@/controllers/useTranslations";

export function PaySharedCartView({ sharedCart }: { sharedCart: SharedCart }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthController();
  const { t } = useTranslations();
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const clear = useCartStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);
  // Set when "Continue" is clicked while logged out, so the login modal's
  // success can pick up and finish the job without a second click.
  const wantsToContinue = useRef(false);

  const total = sharedCart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const proceedToCheckout = useCallback(() => {
    // Replaces the viewer's own cart with exactly what was shared — checking
    // out with a mix of their own items and someone else's request would be
    // confusing, so this is a clean swap, not a merge.
    clear();
    for (const item of sharedCart.items) {
      addItem(
        {
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image ? toUploadUrl(item.image) : undefined,
          deliveryFeeInsideCity: item.deliveryFeeInsideCity,
          deliveryFeeOutsideCity: item.deliveryFeeOutsideCity,
        },
        item.quantity
      );
    }
    toast.success(t("pay.addedToYourCart", "Added to your cart"));
    router.push("/checkout");
  }, [clear, addItem, sharedCart, router, t]);

  const onContinue = () => {
    if (!isAuthenticated) {
      wantsToContinue.current = true;
      openAuthModal("login");
      return;
    }
    proceedToCheckout();
  };

  useEffect(() => {
    if (isAuthenticated && wantsToContinue.current) {
      wantsToContinue.current = false;
      proceedToCheckout();
    }
  }, [isAuthenticated, proceedToCheckout]);

  return (
    <main className="mx-auto max-w-lg px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <div className="mb-6 text-center">
        <Gift size={32} className="mx-auto mb-2 text-primary" />
        <h1 className="text-xl font-semibold">
          {t("pay.wantsYouToPay", "{name} wants you to pay for this", { name: sharedCart.createdByName })}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t("pay.reviewBelow", "Review it below, then check out and pay for it yourself.")}
        </p>
      </div>

      {sharedCart.isFulfilled ? (
        <div className="rounded-md border border-border bg-surface p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-green-600" />
          <p className="text-sm font-medium">{t("pay.alreadyPaid", "This has already been paid for.")}</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex flex-col gap-3">
              {sharedCart.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-background">
                    {item.image && (
                      <Image src={toUploadUrl(item.image)} alt={item.name} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.name}</p>
                    <p className="text-xs text-muted">{t("checkout.qty", "Qty {n}", { n: item.quantity })}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
              <span>{t("pay.itemsTotal", "Items total")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {t("pay.deliveryFeeAtCheckout", "Delivery fee is added at checkout.")}
            </p>
          </div>

          <button
            onClick={onContinue}
            className="mt-4 w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            {isAuthenticated
              ? t("pay.continueToCheckout", "Continue to checkout")
              : t("pay.signInToContinue", "Sign in to continue")}
          </button>
        </>
      )}
    </main>
  );
}
