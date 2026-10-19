"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/controllers/useAuthStore";
import { useNotificationStore } from "@/controllers/useNotificationStore";

const POLL_MS = 60_000;

// Keeps the bell fresh while someone is signed in: loads at once, every
// minute while the tab is visible, and right away when the tab comes back
// into view. Clears on logout so the next person on a shared browser never
// sees the last one's notifications. Mounted once — see app/providers.tsx.
export function useNotificationPolling() {
  const token = useAuthStore((s) => s.token);
  const load = useNotificationStore((s) => s.load);
  const clear = useNotificationStore((s) => s.clear);

  useEffect(() => {
    if (!token) {
      clear();
      return;
    }
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    // A push arriving while the site is open: refresh the bell straight away.
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "notification") load();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [token, load, clear]);
}
