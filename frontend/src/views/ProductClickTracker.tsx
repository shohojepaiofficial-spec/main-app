"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackProductClick } from "@/lib/analytics";

// Invisible — tracks a product detail view as a "click" for the admin
// analytics dashboard. Counting arrivals at the page (rather than
// intercepting every card's onClick) catches every entry point — shop grid,
// suggestions, a shared link — with one component.
export function ProductClickTracker({ productId }: { productId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    trackProductClick(productId, pathname);
  }, [productId, pathname]);

  return null;
}
