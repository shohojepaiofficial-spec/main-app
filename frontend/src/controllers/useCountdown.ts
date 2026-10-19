"use client";

import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

// Time left until `endsAt`, re-read every minute. `null` before mount (the
// server can't know the viewer's clock) and once the time has passed.
export function useCountdown(endsAt: string | undefined) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, MINUTE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [endsAt]);

  if (!endsAt || now === null) return null;
  const msLeft = new Date(endsAt).getTime() - now;
  if (msLeft <= 0) return null;
  const minutes = Math.floor(msLeft / MINUTE_MS);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60, msLeft };
}
