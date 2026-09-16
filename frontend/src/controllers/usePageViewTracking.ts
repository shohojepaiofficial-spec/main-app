"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

// Mounted once, globally (see app/providers.tsx). Skips /admin/* on purpose —
// an admin browsing their own control panel isn't storefront traffic, and
// counting it would pollute "top routes"/"unique visitors" for the analytics
// dashboard that's reading this same data.
export function usePageViewTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackPageView(pathname);
  }, [pathname]);
}
