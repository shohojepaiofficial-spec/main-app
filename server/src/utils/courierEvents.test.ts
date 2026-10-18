import { describe, expect, it } from "vitest";
import { recordCourierStatus } from "./courierEvents";
import type { ICourierEvent } from "../models/Order";

const order = () => ({ courierTrackingStatus: undefined as string | undefined, courierEvents: [] as ICourierEvent[] });

describe("courier status history", () => {
  it("keeps each new status once, oldest first", () => {
    const o = order();
    expect(recordCourierStatus(o, { status: "Pending", source: "pathao", kind: "booked", byName: "Rahim" })).toBe(true);
    expect(recordCourierStatus(o, { status: "Pending", source: "pathao", kind: "refresh" })).toBe(false);
    expect(recordCourierStatus(o, { status: "pickup", source: "pathao", kind: "refresh" })).toBe(true);
    expect(recordCourierStatus(o, { status: "Pickup", source: "pathao", kind: "refresh" })).toBe(false);
    expect(o.courierEvents.map((e) => e.status)).toEqual(["Pending", "pickup"]);
    expect(o.courierEvents[0]).toMatchObject({ kind: "booked", byName: "Rahim" });
    expect(o.courierTrackingStatus).toBe("Pickup");
  });
  it("ignores an empty status", () => {
    const o = order();
    expect(recordCourierStatus(o, { status: "  ", source: "manual", kind: "manual" })).toBe(false);
    expect(o.courierEvents).toHaveLength(0);
  });
});
