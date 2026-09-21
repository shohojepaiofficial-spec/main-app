"use client";

import { useEffect } from "react";
import { useUIStore } from "@/controllers/useUIStore";
import { useTranslationStore } from "@/controllers/useTranslationStore";

// The one hook every translated string goes through — both directly (for
// placeholders, toasts, aria-labels — anywhere a plain string is needed
// instead of JSX) and indirectly via <T>, which just wraps this for the
// common "translated text as JSX children" case. See
// docs/ARCHITECTURE.md's "Translations (i18n)" section.
export function useTranslations() {
  const locale = useUIStore((s) => s.locale);
  const dictionary = useTranslationStore((s) => s.dictionary);
  const ensureLoaded = useTranslationStore((s) => s.ensureLoaded);

  useEffect(() => {
    if (locale === "bn") ensureLoaded();
  }, [locale, ensureLoaded]);

  const t = (key: string, fallback: string): string => {
    if (locale !== "bn") return fallback;
    return dictionary?.[key] ?? fallback;
  };

  return { t, locale };
}
