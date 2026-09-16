"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { useCartStore } from "@/controllers/useCartStore";
import * as promoService from "@/services/promoService";

// Invisible — mounted on pages that can carry a `?promo=CODE` link (a shared
// product link, or a banner's CTA href pointing at one). Renders nothing;
// just applies the code to the cart on landing, the same code path as
// typing it into the cart's promo box. `productId` scopes validation to a
// specific product's page (see server's validatePromoCode); omit it on the
// general shop listing.
export function PromoAutoApply({ code, productId }: { code?: string; productId?: string }) {
  const promo = useCartStore((s) => s.promo);
  const applyPromo = useCartStore((s) => s.applyPromo);

  useEffect(() => {
    if (!code) return;
    if (promo?.code === code.trim().toUpperCase()) return;

    promoService
      .validatePromoCode(code, productId)
      .then((result) => {
        applyPromo(result);
        toast.success(`Code "${result.code}" applied`);
      })
      .catch(() => {
        // A bad/expired code in a shared link shouldn't block the page —
        // just don't apply anything.
      });
  }, [code, productId, promo, applyPromo]);

  return null;
}
