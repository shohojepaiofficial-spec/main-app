"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";
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
    if (!isOpen) return;
    closeButton.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  if (!popup || !isOpen) return null;
  const isExternal = popup.button?.href.startsWith("http");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={popup.title ? "site-popup-title" : undefined}
        aria-label={popup.title ? undefined : t("popup.label", "Announcement")}
        className="relative w-full max-w-md overflow-hidden rounded-lg bg-surface text-foreground shadow-xl"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label={t("common.close", "Close")}
          className="absolute right-3 top-3 z-10 rounded-full bg-surface/80 p-1 text-muted hover:text-foreground"
        >
          <X size={20} />
        </button>
        {popup.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={popup.image} alt={popup.title || t("popup.label", "Announcement")} className="max-h-80 w-full object-cover" />
        )}
        {(popup.title || popup.message || popup.button) && (
          <div className="flex flex-col gap-3 p-6 text-center">
            {popup.title && (
              <p id="site-popup-title" className="text-xl font-semibold">
                {popup.title}
              </p>
            )}
            {popup.message && <p className="whitespace-pre-line text-sm text-muted">{popup.message}</p>}
            {popup.button && (
              <Link
                href={popup.button.href}
                onClick={close}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="mt-1 inline-block rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary-hover"
              >
                {popup.button.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
