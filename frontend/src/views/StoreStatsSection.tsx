"use client";

import Link from "next/link";
import { Package, LayoutGrid, Star, Truck, MapPin, type LucideIcon } from "lucide-react";
import { useTranslations } from "@/controllers/useTranslations";
import type { StoreStatKind, VisibleStat } from "@/lib/storeStats";

const ICONS: Record<StoreStatKind, LucideIcon> = {
  products: Package,
  categories: LayoutGrid,
  rating: Star,
  delivered: Truck,
  districts: MapPin,
};

// Static class names so Tailwind can see them — one column per stat on
// wider screens, two per row on phones. Fewer stats get a narrower row so
// they don't drift to the far edges of the panel.
const COLUMNS: Record<number, string> = {
  2: "max-w-xl sm:grid-cols-2",
  3: "max-w-3xl sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
};

function labelFor(t: ReturnType<typeof useTranslations>["t"], stat: VisibleStat): string {
  const labels: Record<StoreStatKind, string> = {
    products: t("stats.products", "Products"),
    categories: t("stats.categories", "Categories"),
    rating: t("stats.rating", "Avg. rating ({count} reviews)", { count: stat.count ?? 0 }),
    delivered: t("stats.delivered", "Orders delivered"),
    districts: t("stats.districts", "Districts reached"),
  };
  return labels[stat.kind];
}

// The homepage's "store in numbers" section — real, live counts (see
// lib/storeStats.ts for which are shown), each linking somewhere relevant.
// Rendered from server-fetched props so the numbers are in the initial HTML.
export function StoreStatsSection({ stats }: { stats: VisibleStat[] }) {
  const { t } = useTranslations();
  if (stats.length === 0) return null;

  return (
    <section aria-labelledby="store-stats-heading" className="mx-auto max-w-7xl px-6 pt-12">
      <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center sm:py-14">
        <h2 id="store-stats-heading" className="text-2xl font-bold sm:text-3xl">
          {t("stats.heading", "Our Store in Numbers")}
        </h2>
        <p className="mt-3 text-muted">
          {t("stats.subheading", "Real, live numbers from our shop — they grow as we do.")}
        </p>

        <ul className={`mx-auto mt-10 grid grid-cols-2 gap-x-6 gap-y-10 ${COLUMNS[stats.length] ?? "sm:grid-cols-4"}`}>
          {stats.map((stat) => {
            const Icon = ICONS[stat.kind];
            return (
              <li key={stat.kind}>
                <Link
                  href={stat.href}
                  className="group flex flex-col items-center rounded-lg px-2 py-4 transition-colors hover:bg-primary/5"
                >
                  <Icon
                    size={52}
                    strokeWidth={1.25}
                    aria-hidden="true"
                    className="text-muted transition-colors group-hover:text-primary"
                  />
                  <span className="mt-5 text-4xl font-bold tabular-nums sm:text-5xl">
                    {stat.value}
                    {stat.kind === "rating" && (
                      <span aria-hidden="true" className="text-primary">
                        ★
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-4 h-1 w-10 rounded-full bg-primary transition-all group-hover:w-16"
                  />
                  <span className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted group-hover:text-foreground sm:text-sm">
                    {labelFor(t, stat)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
