"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuditActors, getAuditLogs, AuditLogParams } from "@/services/auditLogService";
import { AuditActor, AuditEntry } from "@/models";

export type AuditFilters = Omit<AuditLogParams, "page" | "limit">;

const PAGE_SIZE = 25;

// Empty-string values are how the filter bar represents "no filter".
function cleanFilters(filters: AuditFilters): AuditFilters {
  const cleaned: AuditFilters = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value) cleaned[key as keyof AuditFilters] = value as never;
  }
  return cleaned;
}

export function useAdminAuditLog(enabled: boolean) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actors, setActors] = useState<AuditActor[]>([]);
  const [filters, setFiltersState] = useState<AuditFilters>({});
  const [page, setPageState] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((targetPage: number, targetFilters: AuditFilters) => {
    setIsLoading(true);
    return getAuditLogs({ page: targetPage, limit: PAGE_SIZE, ...cleanFilters(targetFilters) })
      .then((data) => {
        setEntries(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPageState(data.page);
        setError(null);
      })
      .catch(() => setError("Could not load the change history. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  // Initial fetch once the admin check passes. Not routed through `load`
  // (which sets state synchronously) to keep react-hooks/set-state-in-effect happy.
  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    Promise.all([getAuditLogs({ page: 1, limit: PAGE_SIZE }), getAuditActors()])
      .then(([data, actorList]) => {
        if (ignore) return;
        setEntries(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPageState(data.page);
        setActors(actorList);
        setError(null);
      })
      .catch(() => {
        if (!ignore) setError("Could not load the change history. Please try again.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [enabled]);

  const setFilters = (next: AuditFilters) => {
    setFiltersState(next);
    void load(1, next);
  };

  const setPage = (next: number) => {
    void load(next, filters);
  };

  const refresh = () => load(page, filters);

  return { entries, actors, filters, setFilters, page, setPage, total, totalPages, isLoading, error, refresh };
}
