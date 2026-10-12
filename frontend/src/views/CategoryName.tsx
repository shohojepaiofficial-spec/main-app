"use client";

import { useTranslations } from "@/controllers/useTranslations";

// A category's name in the shopper's language: the Bangla name staff set at
// /admin/categories when there is one, otherwise the English name. A client
// component so server-rendered pages (CategoryTile) can show it.
export function CategoryName({ name, nameBn }: { name: string; nameBn?: string }) {
  const { locale } = useTranslations();
  return <>{locale === "bn" && nameBn ? nameBn : name}</>;
}
