"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as popupService from "@/services/popupService";
import { SitePopupSettings } from "@/models";

export function useAdminPopup() {
  const [settings, setSettings] = useState<SitePopupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    popupService
      .getPopupSettings()
      .then((data) => {
        if (!ignore) setSettings(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load popup");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const save = async (input: popupService.PopupInput, image?: File) => {
    try {
      const updated = await popupService.updatePopup(input, image);
      setSettings(updated);
      toast.success("Popup saved");
      return true;
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? "Failed to save popup");
      return false;
    }
  };

  return { settings, isLoading, save };
}
