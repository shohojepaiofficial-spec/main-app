"use client";

import { useBrowserPush } from "@/controllers/useBrowserPush";
import { useTranslations } from "@/controllers/useTranslations";

// Settings: turn pop-up (push) notifications on or off for this browser.
// The bell always works; this only adds alerts when the site isn't open.
export function BrowserPushSection() {
  const { t } = useTranslations();
  const { status, isBusy, turnOn, turnOff } = useBrowserPush();

  const note = (() => {
    switch (status) {
      case "unsupported":
        return t("settings.pushUnsupported", "This browser can't show notifications. On iPhone, add the site to your Home Screen first.");
      case "not_configured":
        return t("settings.pushNotReady", "Browser notifications aren't available yet.");
      case "denied":
        return t("settings.pushBlocked", "Notifications are blocked for this site. Allow them in your browser's site settings, then try again.");
      default:
        return null;
    }
  })();

  const canToggle = status === "on" || status === "off";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">{t("settings.browserNotifications", "Browser notifications")}</h2>
        <p className="mt-1 text-xs text-muted">
          {t(
            "settings.browserNotificationsHint",
            "Get a pop-up on this device about your orders, even when the site is closed. Your notifications always show under the bell either way."
          )}
        </p>
      </div>

      <label className={`flex items-center gap-2 text-sm ${canToggle ? "cursor-pointer" : "opacity-60"}`}>
        <input
          type="checkbox"
          checked={status === "on"}
          disabled={!canToggle || isBusy}
          onChange={(e) => (e.target.checked ? turnOn() : turnOff())}
        />
        {status === "checking"
          ? t("settings.pushChecking", "Checking...")
          : t("settings.pushOnThisDevice", "Show notifications on this device")}
      </label>

      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
