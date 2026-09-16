"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { useAuthStore } from "@/controllers/useAuthStore";
import { useCartStore } from "@/controllers/useCartStore";
import { useUIStore } from "@/controllers/useUIStore";
import { useOAuthBridge } from "@/controllers/useOAuthBridge";
import { useRefreshUser } from "@/controllers/useRefreshUser";
import { usePageViewTracking } from "@/controllers/usePageViewTracking";
import { useWishlistSync } from "@/controllers/useWishlistSync";

// Global, render-nothing hooks that need to run once for the whole app,
// regardless of which page is showing.
function AppEffects() {
  useOAuthBridge();
  useRefreshUser();
  usePageViewTracking();
  useWishlistSync();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
    // See useCartStore.ts/useUIStore.ts's `skipHydration` comments — these
    // are what actually load the persisted cart/locale, deliberately
    // deferred until after the first client render agrees with the server.
    useCartStore.persist.rehydrate();
    useUIStore.persist.rehydrate();
  }, [hydrate]);

  return (
    <SessionProvider>
      <AppEffects />
      {children}
    </SessionProvider>
  );
}
