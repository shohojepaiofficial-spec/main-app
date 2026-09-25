"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getUsers, updateUserAccess } from "@/services/userService";
import { ManagedUser, Permission, UserRole } from "@/models";

export interface UserFilters {
  search?: string;
  role?: UserRole;
  permission?: Permission;
  dateFrom?: string;
  dateTo?: string;
}

// Empty-string values are how the filter bar's <select>/<input>s represent
// "no filter" — dropped here rather than sent as `role=`, etc., since the
// backend only ever checks a query param's presence.
function cleanFilters(filters: UserFilters): UserFilters {
  const cleaned: UserFilters = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value) cleaned[key as keyof UserFilters] = value as never;
  }
  return cleaned;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filters, setFiltersState] = useState<UserFilters>({});
  const [page, setPageState] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback((targetPage: number, targetFilters: UserFilters) => {
    setIsLoading(true);
    return getUsers({ page: targetPage, ...cleanFilters(targetFilters) })
      .then((data) => {
        setUsers(data.items);
        setTotalPages(data.totalPages);
        setPageState(data.page);
      })
      .catch(() => {
        toast.error("Failed to load users");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Mount-only fetch, deliberately not routed through `load` — `isLoading`
  // already starts `true`, and calling `load` (which sets it synchronously)
  // directly in the effect body trips `react-hooks/set-state-in-effect`.
  // `load` itself is only for interactive re-fetches (filters/pagination)
  // below.
  useEffect(() => {
    let ignore = false;
    getUsers({ page: 1 })
      .then((data) => {
        if (ignore) return;
        setUsers(data.items);
        setTotalPages(data.totalPages);
        setPageState(data.page);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load users");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const setPage = (targetPage: number) => load(targetPage, filters);

  // Any filter change resets to page 1 — the previous page number is
  // meaningless against a differently-sized result set.
  const setFilters = (next: UserFilters) => {
    setFiltersState(next);
    load(1, next);
  };

  const updateAccess = async (
    id: string,
    access: { role: UserRole; permissions: Permission[] }
  ) => {
    setSavingId(id);
    try {
      const updated = await updateUserAccess(id, access);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success("Access updated");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to update access");
    } finally {
      setSavingId(null);
    }
  };

  return { users, filters, setFilters, page, totalPages, setPage, isLoading, savingId, updateAccess };
}
