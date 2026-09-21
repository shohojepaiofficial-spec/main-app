"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "@/controllers/useTranslations";

export interface BreadcrumbItem {
  // The literal fallback text — also the actual text used as-is for store
  // content (a product's category/name), which isn't a code string this
  // system can translate.
  label: string;
  // Present only for crumbs that ARE a fixed code string (e.g. "Home",
  // "Shop") — translated via t(key, label) when set.
  key?: string;
  href?: string;
}

// Not just decorative: a linked crumb is a real, crawlable internal link
// (unlike a plain text label), which is what makes something like a
// product's category actually count for SEO instead of being inert text.
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const { t } = useTranslations();
  return (
    <nav
      aria-label={t("common.breadcrumb", "Breadcrumb")}
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted"
    >
      {items.map((item, index) => {
        const text = item.key ? t(item.key, item.label) : item.label;
        return (
          <span key={item.href ?? item.label} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={12} className="text-border" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground hover:underline">
                {text}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {text}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
