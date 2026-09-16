"use client";

import { useUIStore } from "@/controllers/useUIStore";
import { Locale } from "@/models";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
];

export function LanguageSwitcher() {
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Select language"
      className="text-xs bg-transparent border border-background/30 rounded px-1.5 py-0.5 cursor-pointer text-inherit [&>option]:text-foreground"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
