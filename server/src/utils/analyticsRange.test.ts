import { describe, it, expect } from "vitest";
import { resolveAnalyticsRange } from "./analyticsRange";

describe("resolveAnalyticsRange", () => {
  it("defaults to 30d for an invalid/missing preset", () => {
    expect(resolveAnalyticsRange(undefined).preset).toBe("30d");
    expect(resolveAnalyticsRange("nonsense").preset).toBe("30d");
  });

  it("returns a null cutoff for 'all'", () => {
    expect(resolveAnalyticsRange("all").since).toBeNull();
  });

  it("resolves 'today' to the start of the current day", () => {
    const { since } = resolveAnalyticsRange("today");
    expect(since).not.toBeNull();
    expect(since!.getHours()).toBe(0);
    expect(since!.getMinutes()).toBe(0);
  });

  it("resolves '7d' to roughly 7 days ago", () => {
    const { since } = resolveAnalyticsRange("7d");
    const diffDays = (Date.now() - since!.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(6.99);
    expect(diffDays).toBeLessThan(7.01);
  });
});
