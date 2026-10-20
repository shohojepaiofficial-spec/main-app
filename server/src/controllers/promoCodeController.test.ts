import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/PromoCode", () => ({ PromoCode: { find: vi.fn(), findOne: vi.fn(), findByIdAndUpdate: vi.fn() } }));
vi.mock("../models/Product", () => ({ Product: { find: vi.fn() } }));
import { PromoCode } from "../models/PromoCode";
import { getActivePromoCodes, validatePromoCode, updatePromoCode } from "./promoCodeController";

const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
beforeEach(() => vi.clearAllMocks());

// SEC-22: codes are private unless staff choose to show them.
describe("public promo list", () => {
  it("asks only for codes marked show-on-site, and drops used-up ones", async () => {
    vi.mocked(PromoCode.find).mockResolvedValue([
      { code: "OPEN", discountType: "percentage", value: 10, scope: "all", usedCount: 0 },
      { code: "GONE", discountType: "flat", value: 50, scope: "all", maxUses: 2, usedCount: 2 },
    ] as never);
    const res = response();
    await getActivePromoCodes({} as Request, res as unknown as Response);
    expect(vi.mocked(PromoCode.find).mock.calls[0][0]).toMatchObject({ isActive: true, showOnSite: true });
    expect(res.json.mock.calls[0][0].map((p: { code: string }) => p.code)).toEqual(["OPEN"]);
  });
});

describe("validatePromoCode", () => {
  it("says a used-up code is fully used", async () => {
    vi.mocked(PromoCode.findOne).mockResolvedValue({ code: "GONE", isActive: true, maxUses: 2, usedCount: 2, scope: "all" } as never);
    const res = response();
    await validatePromoCode({ body: { code: "gone" }, params: {} } as unknown as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe("updatePromoCode", () => {
  it("removes a limit that was cleared on the form", async () => {
    vi.mocked(PromoCode.findOne).mockResolvedValue(null as never);
    vi.mocked(PromoCode.findByIdAndUpdate).mockResolvedValue({ id: "p1", code: "SAVE10" } as never);
    const res = response();
    const body = { code: "save10", discountType: "percentage", value: 10, scope: "all", isActive: true, expiresAt: null, showOnSite: false, maxUses: null, maxUsesPerCustomer: 1 };
    await updatePromoCode({ params: { id: "507f1f77bcf86cd799439011" }, body } as unknown as Request, res as unknown as Response);
    const update = vi.mocked(PromoCode.findByIdAndUpdate).mock.calls[0][1] as { $set: Record<string, unknown>; $unset: Record<string, unknown> };
    expect(update.$set).toMatchObject({ code: "SAVE10", showOnSite: false, maxUsesPerCustomer: 1 });
    expect(update.$unset).toEqual({ expiresAt: 1, maxUses: 1, product: 1 });
  });
});
