import { describe, expect, it } from "vitest";
import { buildStaffOrderTimeline } from "./staffOrderTimeline";

const base = { createdAt: "2026-10-01T10:00:00Z", paymentMethod: "cod" as const, statusHistory: [{ status: "pending" as const, at: "2026-10-01T10:00:00Z" }] };
const states = (order: Parameters<typeof buildStaffOrderTimeline>[0]) => buildStaffOrderTimeline(order).map((s) => `${s.key}:${s.state}`);

describe("staff order timeline", () => {
  it("waits on confirmation for a new order", () => {
    expect(states({ ...base, status: "pending" })).toEqual(["placed:done", "confirmed:current", "booked:upcoming", "shipped:upcoming", "delivered:upcoming"]);
  });
  it("moves to booking once confirmed, and records who confirmed", () => {
    const steps = buildStaffOrderTimeline({ ...base, status: "paid", statusHistory: [...base.statusHistory, { status: "paid", at: "2026-10-01T11:00:00Z", byName: "Rahim" }] });
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
    expect(steps[1]).toMatchObject({ by: "Rahim", at: "2026-10-01T11:00:00Z" });
  });
  it("is waiting on pickup after booking, and finished when delivered", () => {
    expect(states({ ...base, status: "paid", courierConsignmentId: "DL1", courierBookedAt: "2026-10-02T09:00:00Z" })[3]).toBe("shipped:current");
    expect(buildStaffOrderTimeline({ ...base, status: "delivered", courierConsignmentId: "DL1" }).every((s) => s.state === "done")).toBe(true);
  });
  it("greys out the steps a cancelled order never reached", () => {
    const steps = states({ ...base, status: "cancelled", statusHistory: [...base.statusHistory, { status: "paid", at: "x" }, { status: "cancelled", at: "y" }] });
    expect(steps).toEqual(["placed:done", "confirmed:done", "booked:skipped", "shipped:skipped", "delivered:skipped", "cancelled:done"]);
  });
});
