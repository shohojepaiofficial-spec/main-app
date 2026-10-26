"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SitePopupContent } from "@/models";
import { useSitePopup } from "@/controllers/useSitePopup";
import { useTranslations } from "@/controllers/useTranslations";

// The storefront announcement popup. Content comes from the server-rendered
// public layout; whether it's open is handled by useSitePopup.
export function SitePopup({ popup }: { popup: SitePopupContent | null }) {
  const { isOpen, close } = useSitePopup(popup);
  const { t } = useTranslations();
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeButton.current?.focus();
  }, [isOpen]);

  if (!popup || !isOpen) return null;
  const isExternal = popup.button?.href.startsWith("http");

  return (
    // Clicking the dark background does nothing on purpose: only the Close
    // button (or the shopper's own button) dismisses the popup.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={popup.title ? "site-popup-title" : undefined}
        aria-label={popup.title ? undefined : t("popup.label", "Announcement")}
        className="w-full max-w-md overflow-hidden rounded-lg bg-surface text-foreground shadow-xl"
      >
        {popup.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={popup.image} alt={popup.title || t("popup.label", "Announcement")} className="max-h-80 w-full object-cover" />
        )}
        <div className="flex flex-col gap-3 p-6 text-center">
          {popup.title && (
            <p id="site-popup-title" className="text-xl font-semibold">
              {popup.title}
            </p>
          )}
          {popup.message && <p className="whitespace-pre-line text-sm text-muted">{popup.message}</p>}
          <div className="mt-2 flex gap-3">
            <button
              ref={closeButton}
              type="button"
              onClick={close}
              className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-primary/5"
            >
              {t("common.close", "Close")}
            </button>
            {popup.button && (
              <Link
                href={popup.button.href}
                onClick={close}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                {popup.button.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
