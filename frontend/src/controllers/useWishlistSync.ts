"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/controllers/useAuthStore";
import { useWishlistStore } from "@/controllers/useWishlistStore";

// Loads the wishlist once there's a logged-in session, clears it on logout
// (so the next person on a shared browser doesn't see the previous user's
// saved items). Mounted once, globally — see app/providers.tsx.
export function useWishlistSync() {
  const token = useAuthStore((s) => s.token);
  const load = useWishlistStore((s) => s.load);
  const clear = useWishlistStore((s) => s.clear);

  useEffect(() => {
    if (token) {
      load();
    } else {
      clear();
    }
  }, [token, load, clear]);
}
