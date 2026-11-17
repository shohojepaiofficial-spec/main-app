"use client";

import { useEffect, useState } from "react";
import * as railwayService from "@/services/railwayService";
import { RailwayUsageResponse } from "@/models";

// Remaining Railway (hosting) credit for the admin dashboard. `enabled` is
// the caller's permission check; a failed lookup just shows as unavailable.
export function useRailwayUsage(enabled: boolean) {
  const [railwayUsage, setRailwayUsage] = useState<RailwayUsageResponse | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    railwayService
      .getRailwayUsage()
      .then((data) => {
        if (!ignore) setRailwayUsage(data);
      })
      .catch(() => {
        if (!ignore) setHasError(true);
      });
    return () => {
      ignore = true;
    };
  }, [enabled]);

  return { railwayUsage, hasError };
}
