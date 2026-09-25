"use client";

import { useEffect, useState } from "react";

// Used by filter bars (Manage Products/Users) to hold a free-text search
// box's value locally and only re-fetch once typing pauses, instead of
// firing a request per keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
