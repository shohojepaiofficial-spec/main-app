"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackProductClick } from "@/lib/analytics";
import { pushToDataLayer } from "@/lib/gtm";

interface ProductClickTrackerProps {
  productId: string;
  // Only needed for the GTM `view_item` push below — the in-house
  // trackProductClick above never needed more than the id/path.
  name: string;
  price: number;
  category: string;
}

// Invisible — tracks a product detail view as a "click" for the admin
// analytics dashboard, and (once GTM is configured) as a GA4-shaped
// `view_item` event for whatever ad-platform tags are set up in GTM.
// Counting arrivals at the page (rather than intercepting every card's
// onClick) catches every entry point — shop grid, suggestions, a shared
// link — with one component.
export function ProductClickTracker({ productId, name, price, category }: ProductClickTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    trackProductClick(productId, pathname);
    pushToDataLayer({
      event: "view_item",
      ecommerce: {
        currency: "BDT",
        value: price,
        items: [{ item_id: productId, item_name: name, item_category: category, price }],
      },
    });
  }, [productId, pathname, name, price, category]);

  return null;
}
