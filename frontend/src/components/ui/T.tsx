"use client";

import { useTranslations } from "@/controllers/useTranslations";

// A translated JSX text node — usable as a child inside a Server Component
// (this is itself a Client Component, but React lets a Server Component
// render one as a child without the parent needing "use client" too), so
// pages that stay server-rendered for SEO don't need to become client
// components just to show Bangla text. `children` doubles as both the
// English fallback and the visible source of truth for what English copy
// actually reads — see docs/ARCHITECTURE.md's "Translations (i18n)"
// section. For non-JSX contexts (placeholders, toasts, aria-labels), use
// the useTranslations() hook's `t(key, fallback)` directly instead.
//
// `vars` fills in `{name}` placeholders for a sentence with an interpolated
// value (e.g. a city name) — see useTranslations.ts#t's own doc comment for
// why this can't just be plain string concatenation around the value.
export function T({
  k,
  vars,
  children,
}: {
  k: string;
  vars?: Record<string, string | number>;
  children: string;
}) {
  const { t } = useTranslations();
  return <>{t(k, children, vars)}</>;
}
