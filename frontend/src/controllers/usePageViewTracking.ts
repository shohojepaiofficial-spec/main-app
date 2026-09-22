"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";
import { pushToDataLayer } from "@/lib/gtm";

// Mounted once, globally (see app/providers.tsx). Skips /admin/* on purpose —
// an admin browsing their own control panel isn't storefront traffic, and
// counting it would pollute "top routes"/"unique visitors" for the analytics
// dashboard that's reading this same data.
//
// Also the one place a GTM `page_view` fires on every client-side route
// change — GTM's own default "Page View" trigger only fires on a real
// browser navigation, not Next's client-side transitions between pages, so
// without this every route after the first load would be invisible to any
// tag configured on that trigger.
export function usePageViewTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackPageView(pathname);
    pushToDataLayer({ event: "page_view", page_path: pathname });
  }, [pathname]);
}
