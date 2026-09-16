"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getUsers, updateUserAccess } from "@/services/userService";
import { ManagedUser, Permission, UserRole } from "@/models";

export function useAdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getUsers()
      .then((data) => {
        if (!ignore) setUsers(data);
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

  return { users, isLoading, savingId, updateAccess };
}
