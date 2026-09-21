"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAllTranslations, updateTranslationBn } from "@/services/translationService";
import { Translation } from "@/models";

export function useAdminTranslations() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getAllTranslations()
      .then((data) => {
        if (!ignore) setTranslations(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load translations");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const updateBn = async (key: string, bn: string) => {
    setSavingKey(key);
    try {
      const updated = await updateTranslationBn(key, bn);
      setTranslations((prev) => prev.map((t) => (t.key === updated.key ? updated : t)));
      toast.success("Translation saved");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Failed to save translation");
    } finally {
      setSavingKey(null);
    }
  };

  return { translations, isLoading, savingKey, updateBn };
}
