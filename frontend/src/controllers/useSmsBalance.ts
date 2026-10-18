"use client";

import { useEffect, useState } from "react";
import * as smsService from "@/services/smsService";
import { SmsBalance } from "@/models";

// Remaining REVE SMS balance for the staff dashboard. `enabled` is the
// caller's permission check; a failed lookup just shows as unavailable.
export function useSmsBalance(enabled: boolean) {
  const [smsBalance, setSmsBalance] = useState<SmsBalance | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    smsService
      .getSmsBalance()
      .then((data) => {
        if (!ignore) setSmsBalance(data);
      })
      .catch(() => {
        if (!ignore) setHasError(true);
      });
    return () => {
      ignore = true;
    };
  }, [enabled]);

  return { smsBalance, hasError };
}
