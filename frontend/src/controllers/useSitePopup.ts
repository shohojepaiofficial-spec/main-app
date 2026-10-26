"use client";

import { useEffect, useState } from "react";
import { SitePopupContent } from "@/models";

// Which popup version this visitor last closed. Browser storage is fine here:
// it's a per-visitor convenience, and if it's unavailable the popup just shows.
const STORAGE_KEY = "site-popup-closed-version";
// A short pause so the popup doesn't cover the page before it has painted.
const SHOW_DELAY_MS = 1200;

function readClosedVersion(): number | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

export function useSitePopup(popup: SitePopupContent | null) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!popup || readClosedVersion() === popup.version) return;
    const timer = window.setTimeout(() => setIsOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [popup]);

  const close = () => {
    setIsOpen(false);
    if (!popup) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(popup.version));
    } catch {
      // Storage blocked — it'll show again next visit, which is acceptable.
    }
  };

  return { isOpen, close };
}
