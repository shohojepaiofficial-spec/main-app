"use client";

import { useUIStore } from "@/controllers/useUIStore";
import { useTranslations } from "@/controllers/useTranslations";
import { Locale } from "@/models";

const LANGUAGES: { code: Locale; key: string; label: string }[] = [
  { code: "en", key: "language.english", label: "English" },
  { code: "bn", key: "language.bangla", label: "বাংলা" },
];

export function LanguageSwitcher() {
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const { t } = useTranslations();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Select language"
      className="text-xs bg-transparent border border-background/30 rounded px-1.5 py-0.5 cursor-pointer text-inherit [&>option]:text-foreground"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {t(lang.key, lang.label)}
        </option>
      ))}
    </select>
  );
}
