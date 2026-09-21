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

  // `vars` fills in `{name}` placeholders in the resolved string (Bangla or
  // the English fallback, either way) — e.g. t("x", "Delivery to {city}.",
  // {city: storeCity}). Needed because a translated sentence's word order
  // around an interpolated value isn't the same across languages, so the
  // value can't just be concatenated onto a translated prefix/suffix.
  const t = (key: string, fallback: string, vars?: Record<string, string | number>): string => {
    const template = locale === "bn" ? (dictionary?.[key] ?? fallback) : fallback;
    if (!vars) return template;
    return Object.entries(vars).reduce(
      (str, [name, value]) => str.replaceAll(`{${name}}`, String(value)),
      template
    );
  };

  return { t, locale };
}
