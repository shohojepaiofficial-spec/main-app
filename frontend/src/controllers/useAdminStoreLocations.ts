"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as storeLocationService from "@/services/storeLocationService";
import { StoreLocation } from "@/models";

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export function useAdminStoreLocations() {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    storeLocationService
      .getAllStoreLocations()
      .then((data) => { if (!ignore) setLocations(data); })
      .catch(() => { if (!ignore) toast.error("Failed to load store locations"); })
      .finally(() => { if (!ignore) setIsLoading(false); });
    return () => { ignore = true; };
  }, []);

  const upsert = (location: StoreLocation) => {
    setLocations((prev) => {
      const exists = prev.some((l) => l.id === location.id);
      const next = exists ? prev.map((l) => (l.id === location.id ? location : l)) : [...prev, location];
      return next.sort((a, b) => a.order - b.order);
    });
  };

  const remove = async (id: string) => {
    setPendingId(id);
    try {
      await storeLocationService.deleteStoreLocation(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      toast.success("Store location deleted");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete store location"));
    } finally {
      setPendingId(null);
    }
  };

  const move = async (id: string, direction: "up" | "down") => {
    setPendingId(id);
    try {
      setLocations(await storeLocationService.moveStoreLocation(id, direction));
    } catch {
      toast.error("Failed to reorder store locations");
    } finally {
      setPendingId(null);
    }
  };

  return { locations, isLoading, pendingId, upsert, remove, move };
}
