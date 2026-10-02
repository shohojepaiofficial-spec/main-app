"use client";

import { useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { detectInAppBrowser, isAndroid, toChromeIntentUrl, type InAppBrowser } from "@/lib/inAppBrowser";
import { useTranslations } from "@/controllers/useTranslations";

// The user agent never changes during a visit, so there's nothing to subscribe to.
const subscribe = () => () => {};
const getUserAgent = () => navigator.userAgent;
// Server render (and the first client render, to match it) assumes a real
// browser; the in-app notice appears right after hydration.
const getServerUserAgent = () => "";

export function useInAppBrowser(): {
  inAppBrowser: InAppBrowser | null;
  canOpenInChrome: boolean;
  openInChrome: () => void;
  copyPageLink: () => Promise<void>;
} {
  const userAgent = useSyncExternalStore(subscribe, getUserAgent, getServerUserAgent);
  const { t } = useTranslations();

  const openInChrome = () => {
    window.location.href = toChromeIntentUrl(window.location.href);
  };

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("auth.inAppLinkCopied", "Link copied. Paste it into Chrome or Safari."));
    } catch {
      toast.error(t("auth.inAppCopyFailed", "Couldn't copy the link. Use the app's menu to open it in your browser."));
    }
  };

  return {
    inAppBrowser: detectInAppBrowser(userAgent),
    canOpenInChrome: isAndroid(userAgent),
    openInChrome,
    copyPageLink,
  };
}
