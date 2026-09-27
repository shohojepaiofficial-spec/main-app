"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "@/controllers/useTranslations";
import type { StoreStatKind, VisibleStat } from "@/lib/storeStats";

function labelFor(t: ReturnType<typeof useTranslations>["t"], stat: VisibleStat): string {
  const labels: Record<StoreStatKind, string> = {
    products: t("stats.products", "Products to explore"),
    categories: t("stats.categories", "Categories"),
    rating: t("stats.rating", "Average rating from {count} reviews", { count: stat.count ?? 0 }),
    delivered: t("stats.delivered", "Orders delivered"),
    districts: t("stats.districts", "Districts delivered to"),
  };
  return labels[stat.kind];
}

// The homepage's "by the numbers" row — real, live counts (see
// lib/storeStats.ts for which are shown), each linking somewhere relevant.
// Rendered from server-fetched props so the numbers are in the initial HTML.
export function StoreStatsRow({ stats }: { stats: VisibleStat[] }) {
  const { t } = useTranslations();
  if (stats.length === 0) return null;

  return (
    <section aria-label={t("stats.heading", "Shop by the numbers")} className="mx-auto max-w-7xl px-6 py-8">
      <ul
        className={`grid grid-cols-2 gap-3 ${
          stats.length >= 5 ? "sm:grid-cols-5" : stats.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {stats.map((stat) => (
          <li key={stat.kind}>
            <Link
              href={stat.href}
              className="group flex h-full flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface px-3 py-5 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="text-2xl font-semibold text-primary sm:text-3xl">
                {stat.value}
                {stat.kind === "rating" && <span aria-hidden="true">★</span>}
              </span>
              <span className="flex items-center gap-0.5 text-xs text-muted group-hover:text-foreground sm:text-sm">
                {labelFor(t, stat)}
                <ChevronRight size={14} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
