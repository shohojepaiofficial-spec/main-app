import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findOne: vi.fn(),
  findReturn: vi.fn(),
  lookup: vi.fn(),
  configured: vi.fn(),
  cities: vi.fn(),
  zones: vi.fn(),
  areas: vi.fn(),
}));
vi.mock("../models/Order", () => ({ Order: { findById: mocks.findById, findOne: mocks.findOne } }));
vi.mock("../models/ReturnRequest", async (original) => ({ ...(await original<typeof import("../models/ReturnRequest")>()), ReturnRequest: { findOne: mocks.findReturn } }));
vi.mock("../models/User", () => ({ User: { findById: () => ({ select: async () => ({ id: "staff", name: "Staff" }) }) } }));
vi.mock("../integrations/pathao", async (original) => ({
  ...(await original<typeof import("../integrations/pathao")>()),
  isPathaoConfigured: mocks.configured,
  lookupPathaoConsignment: mocks.lookup,
  getCachedPathaoCities: mocks.cities,
  getCachedPathaoZones: mocks.zones,
  getCachedPathaoAreas: mocks.areas,
}));

import { updateCourierInfo, markBookedOnPathaoSite } from "./orderController";
import { normalizeConsignmentId, isValidConsignmentId, samePhone } from "../utils/courierConsignment";
import { verifyPathaoRef } from "../utils/pathaoAddress";
import type { AuthRequest } from "../middleware/auth";

const ORDER_ID = "665f1f77bcf86cd7994a1b2c";
const makeOrder = (extra: Record<string, unknown> = {}) => ({
  _id: ORDER_ID, id: ORDER_ID, shippingAddress: { phone: "01712345678" }, courierEvents: [] as unknown[], save: vi.fn(), ...extra,
});
const req = (body: Record<string, unknown>) => ({ params: { id: ORDER_ID }, body, method: "PATCH", userId: "staff" }) as unknown as AuthRequest;
const res = () => {
  const r = { status: vi.fn(), json: vi.fn() };
  r.status.mockReturnValue(r);
  return r;
};
// The first findById is the order itself; the second is populatedOrder's
// reload, which chains two populate() calls.
function orderLookups(order: ReturnType<typeof makeOrder>) {
  mocks.findById.mockResolvedValueOnce(order).mockReturnValueOnce({ populate: () => ({ populate: async () => order }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findOne.mockReturnValue({ select: async () => null });
  mocks.findReturn.mockReturnValue({ select: async () => null });
  mocks.configured.mockReturnValue(true);
});

describe("consignment number tidy-up", () => {
  it("drops spaces and dashes and upper-cases", () => {
    expect(normalizeConsignmentId(" dl-2310 18ab ")).toBe("DL231018AB");
  });
  it("refuses what isn't letters and digits", () => {
    expect(isValidConsignmentId("DL231018AB")).toBe(true);
    expect(isValidConsignmentId("+8801712345678")).toBe(false);
    expect(isValidConsignmentId("HTTPS://PATHAO.COM/X")).toBe(false);
    expect(isValidConsignmentId("AB")).toBe(false);
  });
  it("treats +880 and 0 numbers as the same phone", () => {
    expect(samePhone("+8801712345678", "01712345678")).toBe(true);
    expect(samePhone("01712345678", "01812345678")).toBe(false);
  });
});

describe("manual courier entry", () => {
  it("refuses a number Pathao doesn't know", async () => {
    mocks.findById.mockResolvedValueOnce(makeOrder());
    mocks.lookup.mockResolvedValue({ result: "not_found" });
    const r = res();
    await updateCourierInfo(req({ consignmentId: "dl 999" }), r as unknown as Response);
    expect(mocks.lookup).toHaveBeenCalledWith("DL999");
    expect(r.status).toHaveBeenCalledWith(400);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ code: "CONSIGNMENT_NOT_FOUND" }));
  });

  it("refuses a number already on another order", async () => {
    mocks.findById.mockResolvedValueOnce(makeOrder());
    mocks.findOne.mockReturnValue({ select: async () => ({ _id: "665f1f77bcf86cd7994aaaaa" }) });
    const r = res();
    await updateCourierInfo(req({ consignmentId: "DL1234" }), r as unknown as Response);
    expect(r.status).toHaveBeenCalledWith(409);
    expect(r.json.mock.calls[0][0].message).toContain("#4AAAAA");
    expect(mocks.lookup).not.toHaveBeenCalled();
  });

  it("asks before saving a parcel going to a different phone", async () => {
    mocks.findById.mockResolvedValueOnce(makeOrder());
    mocks.lookup.mockResolvedValue({ result: "found", orderStatus: "Pending", recipientPhone: "01999999999" });
    const r = res();
    await updateCourierInfo(req({ consignmentId: "DL1234" }), r as unknown as Response);
    expect(r.status).toHaveBeenCalledWith(409);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ code: "COURIER_PHONE_MISMATCH" }));
  });

  it("saves a found number as verified, with Pathao's status", async () => {
    const order = makeOrder();
    orderLookups(order);
    mocks.lookup.mockResolvedValue({ result: "found", orderStatus: "Pickup Requested", recipientPhone: "+8801712345678" });
    await updateCourierInfo(req({ consignmentId: "DL1234" }), res() as unknown as Response);
    expect(order).toMatchObject({ courierProvider: "pathao", courierConsignmentId: "DL1234", courierTrackingStatus: "Pickup Requested" });
    expect((order as Record<string, unknown>).courierVerifiedAt).toBeInstanceOf(Date);
    expect(order.save).toHaveBeenCalled();
  });

  it("saves unverified when Pathao can't be reached", async () => {
    const order = makeOrder();
    orderLookups(order);
    mocks.lookup.mockResolvedValue({ result: "unreachable" });
    await updateCourierInfo(req({ consignmentId: "DL1234" }), res() as unknown as Response);
    expect(order).toMatchObject({ courierConsignmentId: "DL1234" });
    expect((order as Record<string, unknown>).courierVerifiedAt).toBeUndefined();
  });

  it("never checks another courier's number with Pathao, and needs its name", async () => {
    mocks.findById.mockResolvedValueOnce(makeOrder());
    const r = res();
    await updateCourierInfo(req({ provider: "other", consignmentId: "SF12345" }), r as unknown as Response);
    expect(r.status).toHaveBeenCalledWith(400);

    const order = makeOrder();
    orderLookups(order);
    await updateCourierInfo(req({ provider: "other", courierName: "Steadfast", consignmentId: "SF12345" }), res() as unknown as Response);
    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(order).toMatchObject({ courierProvider: "other", courierName: "Steadfast", courierConsignmentId: "SF12345" });
  });

  it("marks an order as booked on Pathao's site, waiting for Pathao", async () => {
    const order = makeOrder();
    orderLookups(order);
    await markBookedOnPathaoSite(req({}), res() as unknown as Response);
    expect(order).toMatchObject({ courierProvider: "pathao" });
    expect((order as Record<string, unknown>).courierAwaitingSince).toBeInstanceOf(Date);
  });
});

describe("Pathao location from checkout", () => {
  beforeEach(() => {
    mocks.cities.mockResolvedValue([{ id: 1, name: "Dhaka" }, { id: 2, name: "Sylhet" }]);
    mocks.zones.mockImplementation(async (cityId: number) => (cityId === 2 ? [{ id: 20, name: "Zindabazar" }] : [{ id: 10, name: "Mirpur" }]));
    mocks.areas.mockResolvedValue([{ id: 200, name: "Ambarkhana" }]);
  });

  it("fills in Pathao's own names for ids that fit together", async () => {
    expect(await verifyPathaoRef({ cityId: 2, zoneId: 20, areaId: 200 })).toEqual({
      cityId: 2, cityName: "Sylhet", zoneId: 20, zoneName: "Zindabazar", areaId: 200, areaName: "Ambarkhana",
    });
  });

  it("refuses a zone from a different city", async () => {
    expect(await verifyPathaoRef({ cityId: 2, zoneId: 10 })).toBeNull();
  });

  it("gives up quietly when Pathao is down", async () => {
    mocks.cities.mockRejectedValue(new Error("timeout"));
    expect(await verifyPathaoRef({ cityId: 2, zoneId: 20 })).toBeNull();
  });
});
