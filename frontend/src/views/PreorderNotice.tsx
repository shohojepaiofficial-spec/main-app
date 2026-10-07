"use client";

import { CalendarClock } from "lucide-react";
import { ProductPreorder } from "@/models";
import { formatShipDate } from "@/lib/preorder";
import { useTranslations } from "@/controllers/useTranslations";

// The product page's pre-order box: when it ships, what each way of paying
// saves, and how many spots are left on a capped pre-order.
export function PreorderNotice({ preorder, spotsLeft }: { preorder: ProductPreorder; spotsLeft: number }) {
  const { t } = useTranslations();
  const { codDiscountPercent: cod, onlineDiscountPercent: online } = preorder;

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-primary">
        <CalendarClock size={15} className="shrink-0" />
        {preorder.shipDate
          ? t("product.preorderShipsAround", "Pre-order — ships around {date}", {
              date: formatShipDate(preorder.shipDate),
            })
          : t("product.preorderLabel", "Pre-order")}
      </p>
      {cod > 0 && (
        <p className="text-foreground">
          {t("product.preorderCodDiscount", "{percent}% off with Cash on Delivery", { percent: cod })}
        </p>
      )}
      {online > 0 && (
        <p className="text-foreground">
          {t("product.preorderOnlineDiscount", "{percent}% off when you pay online", { percent: online })}{" "}
          <span className="text-xs text-muted">({t("common.comingSoon", "Coming soon")})</span>
        </p>
      )}
      {spotsLeft === 0 ? (
        <p className="font-medium text-red-600">{t("product.preorderFull", "Pre-orders are full")}</p>
      ) : (
        Number.isFinite(spotsLeft) &&
        spotsLeft <= 20 && (
          <p className="text-xs text-muted">
            {t("product.preorderSpotsLeft", "Only {count} pre-order spots left", { count: spotsLeft })}
          </p>
        )
      )}
    </div>
  );
}
