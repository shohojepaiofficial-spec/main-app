"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as categoryService from "@/services/categoryService";
import { ManagedCategory } from "@/models";

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export function useAdminCategories() {
  const [categories, setCategories] = useState<ManagedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    categoryService
      .getAllCategories()
      .then((data) => {
        if (!ignore) setCategories(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load categories");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const upsert = (category: ManagedCategory) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      const next = exists ? prev.map((c) => (c.id === category.id ? category : c)) : [...prev, category];
      return next.sort((a, b) => a.order - b.order);
    });
  };

  const remove = async (id: string) => {
    setPendingId(id);
    try {
      await categoryService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Category deleted");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete category"));
    } finally {
      setPendingId(null);
    }
  };

  const move = async (id: string, direction: "up" | "down") => {
    setPendingId(id);
    try {
      setCategories(await categoryService.moveCategory(id, direction));
    } catch {
      toast.error("Failed to reorder categories");
    } finally {
      setPendingId(null);
    }
  };

  return { categories, isLoading, pendingId, upsert, remove, move };
}
