"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { disablePush, enablePush, getCurrentSubscription, isPushSupported } from "@/lib/push";
import { getPushPublicKey } from "@/services/notificationService";
import { useTranslations } from "@/controllers/useTranslations";

export type BrowserPushStatus = "checking" | "unsupported" | "not_configured" | "denied" | "off" | "on";

// State + handlers for the "Browser notifications" switch in Settings.
// This is per browser/device, not per account.
export function useBrowserPush() {
  const { t } = useTranslations();
  const [status, setStatus] = useState<BrowserPushStatus>("checking");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.resolve()
      .then(async (): Promise<BrowserPushStatus> => {
        if (!isPushSupported()) return "unsupported";
        if (!(await getPushPublicKey())) return "not_configured";
        if (Notification.permission === "denied") return "denied";
        return (await getCurrentSubscription()) ? "on" : "off";
      })
      .then((next) => { if (!ignore) setStatus(next); })
      .catch(() => { if (!ignore) setStatus("off"); });
    return () => { ignore = true; };
  }, []);

  const turnOn = async () => {
    setIsBusy(true);
    try {
      const result = await enablePush();
      if (result === "enabled") {
        setStatus("on");
        toast.success(t("settings.pushOn", "Browser notifications are on"));
      } else {
        setStatus(result === "denied" ? "denied" : result === "not_configured" ? "not_configured" : "unsupported");
      }
    } catch {
      toast.error(t("settings.pushFailed", "Couldn't turn on browser notifications"));
    } finally {
      setIsBusy(false);
    }
  };

  const turnOff = async () => {
    setIsBusy(true);
    try {
      await disablePush();
      setStatus("off");
    } finally {
      setIsBusy(false);
    }
  };

  return { status, isBusy, turnOn, turnOff };
}
