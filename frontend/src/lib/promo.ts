import { AppliedPromo } from "@/models";
import { formatCurrency } from "@/lib/currency";

export const formatPromoDiscount = (promo: AppliedPromo) =>
  promo.discountType === "percentage" ? `${promo.value}% off` : `${formatCurrency(promo.value)} off`;

// Makes sure a link that's meant to carry a discount actually does, even if
// whoever wrote the href (an admin setting a banner's CTA, for instance)
// forgot to add it by hand. Works on relative paths like "/shop?category=x".
export const withPromoParam = (href: string, code?: string) => {
  if (!code) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("promo", code);
  return `${path}?${params.toString()}`;
};
