// Shared by getAnalyticsOverview — resolves the dashboard's range selector
// into an actual cutoff Date. Applied only to time-series-shaped data
// (orders, traffic, product clicks); product/user totals stay "as of now"
// regardless of range, since a stock count or role breakdown doesn't have a
// meaningful time window.
export type AnalyticsRangePreset = "today" | "7d" | "30d" | "all";

const VALID_PRESETS: AnalyticsRangePreset[] = ["today", "7d", "30d", "all"];

export function resolveAnalyticsRange(raw: unknown): {
  preset: AnalyticsRangePreset;
  since: Date | null;
} {
  const preset = VALID_PRESETS.includes(raw as AnalyticsRangePreset)
    ? (raw as AnalyticsRangePreset)
    : "30d";

  if (preset === "all") return { preset, since: null };

  const since = new Date();
  if (preset === "today") {
    since.setHours(0, 0, 0, 0);
  } else if (preset === "7d") {
    since.setTime(since.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    since.setTime(since.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { preset, since };
}
