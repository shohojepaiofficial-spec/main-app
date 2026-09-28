import type { StoreStats } from "@/models";

// Which homepage stats are worth showing, and how. A small number is worse
// than no number ("2 orders delivered" undersells the store), so each stat
// only appears once it clears its own threshold, and the whole section only
// once at least two do. Numbers are always real — rounded down, never up.

export type StoreStatKind = "products" | "categories" | "rating" | "delivered" | "districts";

export interface VisibleStat {
  kind: StoreStatKind;
  // Display value: "120+", "8", "4.8".
  value: string;
  // Extra number some labels need ("{count} reviews").
  count?: number;
  href: string;
}

export const MIN_VISIBLE_STATS = 2;

const THRESHOLDS = {
  products: 10,
  categories: 3,
  reviews: 5,
  // A mediocre average isn't something to advertise.
  rating: 4,
  delivered: 20,
  districts: 5,
};

// "7", "40+", "150+", "1,200+" — a round number that's never above the real one.
export function roundDownForDisplay(n: number): string {
  if (n < 10) return String(n);
  const step = n < 100 ? 10 : n < 1000 ? 50 : 100;
  const rounded = Math.floor(n / step) * step;
  return `${rounded.toLocaleString("en-US")}${rounded === n ? "" : "+"}`;
}

export function visibleStats(stats: StoreStats | null): VisibleStat[] {
  if (!stats) return [];
  const visible: VisibleStat[] = [];

  if (stats.productCount >= THRESHOLDS.products) {
    visible.push({ kind: "products", value: roundDownForDisplay(stats.productCount), href: "/shop" });
  }
  if (stats.categoryCount >= THRESHOLDS.categories) {
    visible.push({ kind: "categories", value: String(stats.categoryCount), href: "/categories" });
  }
  if (
    stats.reviewCount >= THRESHOLDS.reviews &&
    stats.averageRating !== null &&
    stats.averageRating >= THRESHOLDS.rating
  ) {
    visible.push({
      kind: "rating",
      // Truncated, not rounded: 4.76 shows as 4.7, never inflated to 4.8.
      value: (Math.floor(stats.averageRating * 10) / 10).toFixed(1),
      count: stats.reviewCount,
      href: "/shop",
    });
  }
  if (stats.deliveredOrderCount >= THRESHOLDS.delivered) {
    visible.push({ kind: "delivered", value: roundDownForDisplay(stats.deliveredOrderCount), href: "/shipping" });
  }
  if (stats.districtCount >= THRESHOLDS.districts) {
    visible.push({ kind: "districts", value: String(stats.districtCount), href: "/shipping" });
  }

  return visible.length >= MIN_VISIBLE_STATS ? visible : [];
}
