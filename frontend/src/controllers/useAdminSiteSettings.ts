"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as siteSettingsService from "@/services/siteSettingsService";
import { SiteSettings } from "@/models";

export function useAdminSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    siteSettingsService
      .getAdminSiteSettings()
      .then((data) => {
        if (!ignore) setSettings(data);
      })
      .catch(() => {
        if (!ignore) toast.error("Failed to load site settings");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const save = async (input: siteSettingsService.SiteSettingsInput) => {
    try {
      const updated = await siteSettingsService.updateSiteSettings(input);
      setSettings(updated);
      toast.success("Site settings saved");
      return true;
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? "Failed to save site settings");
      return false;
    }
  };

  return { settings, isLoading, save };
}
