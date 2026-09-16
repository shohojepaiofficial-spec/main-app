"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as analyticsService from "@/services/analyticsService";
import { AnalyticsOverview, AnalyticsRangePreset } from "@/models";

export function useAdminAnalytics() {
  const [range, setRange] = useState<AnalyticsRangePreset>("30d");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = () => {
    setIsLoading(true);
    return analyticsService
      .getAnalyticsOverview(range)
      .then((data) => setOverview(data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    // The `setIsLoading(true)` needs to happen on every range change, not
    // just on mount — deferred into this `.then()` (rather than called
    // synchronously in the effect body) for the same reason as the search
    // debounce in AdminOrderFormModal.tsx.
    Promise.resolve()
      .then(() => {
        setIsLoading(true);
        return analyticsService.getAnalyticsOverview(range);
      })
      .then((data) => {
        if (!ignore) setOverview(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load analytics");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [range]);

  return { overview, isLoading, range, setRange, reload };
}
