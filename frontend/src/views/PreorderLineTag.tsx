"use client";

import { formatShipDate } from "@/lib/preorder";
import { useTranslations } from "@/controllers/useTranslations";

// "Pre-order · ships around 15 Nov 2026" under a cart, checkout or order
// line. `shipDate` is optional — the admin may not have set one.
export function PreorderLineTag({ preorder }: { preorder: { shipDate?: string } }) {
  const { t } = useTranslations();
  return (
    <p className="text-xs font-medium text-primary">
      {preorder.shipDate
        ? t("cart.preorderShipsAround", "Pre-order · ships around {date}", {
            date: formatShipDate(preorder.shipDate),
          })
        : t("product.preorderLabel", "Pre-order")}
    </p>
  );
}
