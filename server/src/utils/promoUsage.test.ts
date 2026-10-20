import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClientSession } from "mongoose";

vi.mock("../models/PromoCode", () => ({ PromoCode: { findOne: vi.fn(), updateOne: vi.fn(), find: vi.fn() } }));
vi.mock("../models/Order", () => ({ Order: { countDocuments: vi.fn() } }));
import { PromoCode } from "../models/PromoCode";
import { Order } from "../models/Order";
import { claimPromoUse, releasePromoUse, promoFullyUsed } from "./promoUsage";

// SEC-22: promo code use limits.
const session = {} as ClientSession;
const withSession = <T>(value: T) => ({ session: () => Promise.resolve(value) });
const promo = (fields: Record<string, unknown> = {}) => ({ _id: "p1", code: "SAVE10", usedCount: 0, ...fields });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PromoCode.updateOne).mockResolvedValue({ modifiedCount: 1 } as never);
  vi.mocked(Order.countDocuments).mockReturnValue(withSession(0) as never);
});

describe("claimPromoUse", () => {
  it("does nothing without an applied code", async () => {
    await claimPromoUse(undefined, { user: "u1" }, session);
    expect(PromoCode.findOne).not.toHaveBeenCalled();
  });

  it("always counts the use, even with no limits (so racing orders conflict)", async () => {
    vi.mocked(PromoCode.findOne).mockReturnValue(withSession(promo()) as never);
    await claimPromoUse("SAVE10", { user: "u1" }, session);
    expect(PromoCode.updateOne).toHaveBeenCalledWith({ _id: "p1" }, { $inc: { usedCount: 1 } }, { session });
  });

  it("only counts the use while under the total cap", async () => {
    vi.mocked(PromoCode.findOne).mockReturnValue(withSession(promo({ maxUses: 5 })) as never);
    await claimPromoUse("SAVE10", { user: "u1" }, session);
    expect(PromoCode.updateOne).toHaveBeenCalledWith({ _id: "p1", usedCount: { $lt: 5 } }, { $inc: { usedCount: 1 } }, { session });
  });

  it("refuses the order once the total cap is reached", async () => {
    vi.mocked(PromoCode.findOne).mockReturnValue(withSession(promo({ maxUses: 5, usedCount: 5 })) as never);
    vi.mocked(PromoCode.updateOne).mockResolvedValue({ modifiedCount: 0 } as never);
    await expect(claimPromoUse("SAVE10", { user: "u1" }, session)).rejects.toMatchObject({ status: 409, message: expect.stringMatching(/fully used/) });
  });

  it("refuses a customer whose account or phone already used it the allowed number of times", async () => {
    vi.mocked(PromoCode.findOne).mockReturnValue(withSession(promo({ maxUsesPerCustomer: 1 })) as never);
    vi.mocked(Order.countDocuments).mockReturnValue(withSession(1) as never);
    await expect(claimPromoUse("SAVE10", { user: "u1", phone: "01712345678" }, session)).rejects.toMatchObject({
      status: 409, message: "This promo code has already been used by this account or phone number.",
    });
    expect(Order.countDocuments).toHaveBeenCalledWith({
      promoCode: "SAVE10", status: { $ne: "cancelled" },
      $or: [{ user: "u1" }, { "shippingAddress.phone": "01712345678" }],
    });
    expect(PromoCode.updateOne).not.toHaveBeenCalled();
  });

  it("counts a staff-entered order (no account) by its phone", async () => {
    vi.mocked(PromoCode.findOne).mockReturnValue(withSession(promo({ maxUsesPerCustomer: 2 })) as never);
    vi.mocked(Order.countDocuments).mockReturnValue(withSession(2) as never);
    await expect(claimPromoUse("SAVE10", { phone: "01712345678" }, session)).rejects.toMatchObject({
      status: 409, message: "This promo code has already been used 2 times by this account or phone number.",
    });
    expect(Order.countDocuments).toHaveBeenCalledWith({
      promoCode: "SAVE10", status: { $ne: "cancelled" }, $or: [{ "shippingAddress.phone": "01712345678" }],
    });
  });

  it("allows a customer under the per-customer limit", async () => {
    vi.mocked(PromoCode.findOne).mockReturnValue(withSession(promo({ maxUsesPerCustomer: 2 })) as never);
    vi.mocked(Order.countDocuments).mockReturnValue(withSession(1) as never);
    await claimPromoUse("SAVE10", { user: "u1", phone: "01712345678" }, session);
    expect(PromoCode.updateOne).toHaveBeenCalledOnce();
  });

  it("skips the per-customer check when nothing identifies the customer", async () => {
    vi.mocked(PromoCode.findOne).mockReturnValue(withSession(promo({ maxUsesPerCustomer: 1 })) as never);
    await claimPromoUse("SAVE10", {}, session);
    expect(Order.countDocuments).not.toHaveBeenCalled();
    expect(PromoCode.updateOne).toHaveBeenCalledOnce();
  });
});

describe("releasePromoUse", () => {
  it("gives a cancelled order's use back, never below zero", async () => {
    await releasePromoUse("SAVE10", session);
    expect(PromoCode.updateOne).toHaveBeenCalledWith({ code: "SAVE10", usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
  });
  it("does nothing for an order without a code", async () => {
    await releasePromoUse(undefined, session);
    expect(PromoCode.updateOne).not.toHaveBeenCalled();
  });
});

describe("promoFullyUsed", () => {
  it("is only true with a cap that is reached", () => {
    expect(promoFullyUsed({ usedCount: 99 })).toBe(false);
    expect(promoFullyUsed({ maxUses: 3, usedCount: 2 })).toBe(false);
    expect(promoFullyUsed({ maxUses: 3, usedCount: 3 })).toBe(true);
  });
});
