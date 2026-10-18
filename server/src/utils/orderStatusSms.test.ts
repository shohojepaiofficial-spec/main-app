import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findById: vi.fn(), countDocuments: vi.fn(), sendSms: vi.fn(), isSmsConfigured: vi.fn() }));
vi.mock("../models/Order", () => ({ Order: { findById: mocks.findById, countDocuments: mocks.countDocuments } }));
vi.mock("../integrations/sms", () => ({ sendSms: mocks.sendSms, isSmsConfigured: mocks.isSmsConfigured }));

import { buildOrderStatusSms, notifyOrderStatusSms, OrderSmsData } from "./orderStatusSms";

const data = (extra: Partial<OrderSmsData> = {}): OrderSmsData => ({ orderId: "665f1f77bcf86cd7994a1b2c", paymentMethod: "cod", totalAmount: 12500, ...extra });
const query = (order: unknown) => ({ select: () => Promise.resolve(order) });
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const EVENTS = ["placed", "paid", "shipped", "delivered", "cancelled"] as const;

beforeEach(() => { vi.resetAllMocks(); mocks.isSmsConfigured.mockReturnValue(true); mocks.sendSms.mockResolvedValue(undefined); mocks.countDocuments.mockResolvedValue(1); });
afterEach(() => vi.unstubAllEnvs());

describe("order status SMS content", () => {
  it("fits one GSM SMS for every event, payment method and a long brand", () => {
    vi.stubEnv("SMS_BRAND_NAME", "Shohoje Pai BD");
    for (const event of EVENTS) {
      for (const paymentMethod of ["cod", "bkash"] as const) {
        const text = buildOrderStatusSms(event, data({ paymentMethod, paymentReceived: true }));
        expect(text).toContain("#4A1B2C");
        expect(text.startsWith("Shohoje Pai BD: ")).toBe(true);
        expect(text.length).toBeLessThanOrEqual(160);
        expect(text).toMatch(/^[\x20-\x7E]+$/); // plain ASCII, never Unicode-priced
      }
    }
  });
  it("tells a COD customer what to pay and explains cancellations", () => {
    expect(buildOrderStatusSms("placed", data())).toContain("Pay Tk 12,500 cash on delivery");
    expect(buildOrderStatusSms("shipped", data())).toContain("keep Tk 12,500 ready");
    expect(buildOrderStatusSms("shipped", data({ paymentMethod: "bkash" }))).not.toContain("Tk");
    expect(buildOrderStatusSms("cancelled", data({ paymentMethod: "bkash", previousStatus: "pending" }))).toContain("no payment");
    expect(buildOrderStatusSms("cancelled", data({ paymentReceived: true }))).toContain("refund");
  });
});

describe("sending order status SMS", () => {
  it("texts the order's shipping phone", async () => {
    mocks.findById.mockReturnValue(query({ id: "665f1f77bcf86cd7994a1b2c", shippingAddress: { phone: "01712345678" }, paymentMethod: "cod", totalAmount: 500 }));
    notifyOrderStatusSms("665f1f77bcf86cd7994a1b2c", "shipped", "paid");
    await settled();
    expect(mocks.sendSms).toHaveBeenCalledWith("01712345678", expect.stringContaining("on its way"));
  });
  it("stops customer-triggered texts to a phone flooded with online orders", async () => {
    const order = (source: string) => query({ id: "665f1f77bcf86cd7994a1b2c", shippingAddress: { phone: "01712345678" }, paymentMethod: "cod", totalAmount: 500, source });
    mocks.countDocuments.mockResolvedValue(4);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const event of ["placed", "cancelled"] as const) {
      mocks.findById.mockReturnValue(order("online"));
      notifyOrderStatusSms("665f1f77bcf86cd7994a1b2c", event);
      await settled();
    }
    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(mocks.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ "shippingAddress.phone": "01712345678", source: "online" }));
    // Staff actions and staff-entered orders still text.
    mocks.findById.mockReturnValue(order("online"));
    notifyOrderStatusSms("665f1f77bcf86cd7994a1b2c", "shipped", "paid");
    mocks.findById.mockReturnValue(order("manual"));
    notifyOrderStatusSms("665f1f77bcf86cd7994a1b2c", "placed");
    await settled(); await settled();
    expect(mocks.sendSms).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
  it("does nothing when SMS isn't configured and never throws on failure", async () => {
    mocks.isSmsConfigured.mockReturnValue(false);
    notifyOrderStatusSms("665f1f77bcf86cd7994a1b2c", "placed");
    expect(mocks.findById).not.toHaveBeenCalled();
    mocks.isSmsConfigured.mockReturnValue(true);
    mocks.findById.mockImplementation(() => { throw new Error("database down"); });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => notifyOrderStatusSms("665f1f77bcf86cd7994a1b2c", "placed")).not.toThrow();
    await settled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
