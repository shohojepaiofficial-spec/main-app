import { describe, expect, it } from "vitest";
import { buildOrderTimeline } from "./orderTimeline";

const at = (day: number) => `2026-10-${String(day).padStart(2, "0")}T10:00:00.000Z`;
const summary = (order: Parameters<typeof buildOrderTimeline>[0]) => buildOrderTimeline(order).map((step) => `${step.key}:${step.state}${step.at ? `@${step.at.slice(8, 10)}` : ""}`);

describe("order timeline", () => {
  it("shows a new order as placed with the rest still to come", () => {
    expect(summary({ status: "pending", createdAt: at(1), statusHistory: [{ status: "pending", at: at(1) }] }))
      .toEqual(["placed:current@01", "confirmed:upcoming", "shipped:upcoming", "delivered:upcoming"]);
  });
  it("dates each step from the status history", () => {
    expect(summary({ status: "shipped", createdAt: at(1), statusHistory: [{ status: "pending", at: at(1) }, { status: "paid", at: at(2) }, { status: "shipped", at: at(4) }] }))
      .toEqual(["placed:done@01", "confirmed:done@02", "shipped:current@04", "delivered:upcoming"]);
  });
  it("counts a skipped step as done, without a date", () => {
    expect(summary({ status: "shipped", createdAt: at(1), statusHistory: [{ status: "pending", at: at(1) }, { status: "shipped", at: at(3) }] }))
      .toEqual(["placed:done@01", "confirmed:done", "shipped:current@03", "delivered:upcoming"]);
  });
  it("marks a delivered order as fully done", () => {
    expect(summary({ status: "delivered", createdAt: at(1), deliveredAt: at(6), statusHistory: [{ status: "pending", at: at(1) }, { status: "delivered", at: at(6) }] }))
      .toEqual(["placed:done@01", "confirmed:done", "shipped:done", "delivered:done@06"]);
  });
  it("falls back to the placed and delivered dates for orders without a history", () => {
    expect(summary({ status: "delivered", createdAt: at(1), deliveredAt: at(5) }))
      .toEqual(["placed:done@01", "confirmed:done", "shipped:done", "delivered:done@05"]);
    expect(summary({ status: "paid", createdAt: at(1) })).toEqual(["placed:done@01", "confirmed:current", "shipped:upcoming", "delivered:upcoming"]);
  });
  it("ends a cancelled order at the last step it reached", () => {
    expect(summary({ status: "cancelled", createdAt: at(1), statusHistory: [{ status: "pending", at: at(1) }, { status: "paid", at: at(2) }, { status: "cancelled", at: at(3) }] }))
      .toEqual(["placed:done@01", "confirmed:done@02", "cancelled:current@03"]);
    expect(summary({ status: "cancelled", createdAt: at(1) })).toEqual(["placed:done@01", "cancelled:current"]);
  });
});
