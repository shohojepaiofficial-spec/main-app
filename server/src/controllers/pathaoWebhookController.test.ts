import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({ findOne: vi.fn(), findById: vi.fn(), exists: vi.fn(), findReturn: vi.fn(), transitionOrder: vi.fn() }));
vi.mock("../models/Order", () => ({ Order: { findOne: mocks.findOne, findById: mocks.findById, exists: mocks.exists } }));
vi.mock("../models/ReturnRequest", () => ({ ReturnRequest: { findOne: mocks.findReturn } }));
vi.mock("../utils/orderTransitions", () => ({ transitionOrder: mocks.transitionOrder }));
import { pathaoWebhook } from "./pathaoWebhookController";

const order = () => ({ id: "665f1f77bcf86cd7994a1b2c", status: "paid", courierEvents: [] as unknown[], courierTrackingStatus: "Pending", courierCheckedAt: undefined as Date | undefined, save: vi.fn() });
const request = (body: unknown, signature?: string) => ({ body, rawBody: Buffer.from(JSON.stringify(body)), get: () => signature } as unknown as Request);
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() });

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("PATHAO_WEBHOOK_SECRET", "s3cret"); vi.stubEnv("PATHAO_WEBHOOK_INTEGRATION_SECRET", "uuid-1"); vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("Pathao webhook endpoint", () => {
  it("answers Pathao's URL check with the integration header and touches nothing", async () => {
    const res = response();
    await pathaoWebhook(request({ event: "webhook_integration" }), res as unknown as Response);
    expect(res.setHeader).toHaveBeenCalledWith("X-Pathao-Merchant-Webhook-Integration-Secret", "uuid-1");
    expect(res.status).toHaveBeenCalledWith(202);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });
  it("refuses an unsigned status update", async () => {
    const res = response();
    await pathaoWebhook(request({ consignment_id: "DL1", order_status: "Delivered" }, "forged"), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });
  it("records the status on the order but leaves the store status alone by default", async () => {
    const o = order(); mocks.findOne.mockResolvedValue(o);
    const res = response();
    await pathaoWebhook(request({ consignment_id: "DL1", order_status: "Delivered" }, "s3cret"), res as unknown as Response);
    expect(mocks.findOne).toHaveBeenCalledWith({ courierConsignmentId: "DL1" });
    expect(o.courierEvents).toEqual([expect.objectContaining({ status: "Delivered", kind: "webhook", source: "pathao" })]);
    expect(o.save).toHaveBeenCalled();
    expect(mocks.transitionOrder).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(202);
  });
  it("moves the order when automatic status is switched on", async () => {
    vi.stubEnv("PATHAO_WEBHOOK_AUTO_STATUS", "true");
    const o = order(); mocks.findOne.mockResolvedValue(o);
    await pathaoWebhook(request({ consignment_id: "DL1", order_status: "Delivered" }, "s3cret"), response() as unknown as Response);
    expect(mocks.transitionOrder).toHaveBeenCalledWith(o.id, "delivered", { actor: { name: "Pathao (automatic)" } });
  });
  it("records a return pickup's status when the consignment isn't an order's", async () => {
    mocks.findOne.mockResolvedValue(null);
    const ret = { id: "r1", pickup: { consignmentId: "RP1", courierEvents: [] as unknown[] }, save: vi.fn() };
    mocks.findReturn.mockResolvedValue(ret);
    const res = response();
    await pathaoWebhook(request({ consignment_id: "RP1", order_status: "Pickup" }, "s3cret"), res as unknown as Response);
    expect(mocks.findReturn).toHaveBeenCalledWith({ "pickup.consignmentId": "RP1" });
    expect(ret.pickup.courierEvents).toEqual([expect.objectContaining({ status: "Pickup", kind: "webhook" })]);
    expect(ret.save).toHaveBeenCalled();
    expect(mocks.transitionOrder).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(202);
  });
  describe("linking a parcel booked on Pathao's own site", () => {
    const awaiting = () => ({ ...order(), courierProvider: "pathao", courierConsignmentId: undefined as string | undefined, courierAwaitingSince: new Date(), courierVerifiedAt: undefined as Date | undefined, courierBookedAt: undefined as Date | undefined });
    it("saves the consignment number from the first update onto the order named by the Merchant Order ID", async () => {
      const o = awaiting(); mocks.findOne.mockResolvedValue(null); mocks.findById.mockResolvedValue(o); mocks.exists.mockResolvedValue(null);
      const res = response();
      await pathaoWebhook(request({ consignment_id: "DL9", merchant_order_id: o.id, order_status: "Pickup Requested" }, "s3cret"), res as unknown as Response);
      expect(o.courierConsignmentId).toBe("DL9");
      expect(o.courierAwaitingSince).toBeUndefined();
      expect(o.courierVerifiedAt).toBeInstanceOf(Date);
      expect(o.courierEvents).toEqual([
        expect.objectContaining({ status: "Linked by Pathao (DL9)", kind: "booked" }),
        expect.objectContaining({ status: "Pickup Requested", kind: "webhook" }),
      ]);
      expect(o.save).toHaveBeenCalled();
    });
    it("links even if staff forgot to press 'booked on Pathao's site'", async () => {
      const o = { ...awaiting(), courierProvider: undefined, courierAwaitingSince: undefined };
      mocks.findOne.mockResolvedValue(null); mocks.findById.mockResolvedValue(o); mocks.exists.mockResolvedValue(null);
      await pathaoWebhook(request({ consignment_id: "DL9", merchant_order_id: o.id, order_status: "Pickup Requested" }, "s3cret"), response() as unknown as Response);
      expect(o.courierConsignmentId).toBe("DL9");
    });
    it("never takes a number another order already has", async () => {
      const o = awaiting(); mocks.findOne.mockResolvedValue(null); mocks.findById.mockResolvedValue(o); mocks.exists.mockResolvedValue({ _id: "x" });
      await pathaoWebhook(request({ consignment_id: "DL9", merchant_order_id: o.id, order_status: "Pickup Requested" }, "s3cret"), response() as unknown as Response);
      expect(o.courierConsignmentId).toBeUndefined();
      expect(o.save).not.toHaveBeenCalled();
    });
    it("leaves an order booked with another courier alone", async () => {
      const o = { ...awaiting(), courierProvider: "other" };
      mocks.findOne.mockResolvedValue(null); mocks.findById.mockResolvedValue(o);
      await pathaoWebhook(request({ consignment_id: "DL9", merchant_order_id: o.id, order_status: "Pickup Requested" }, "s3cret"), response() as unknown as Response);
      expect(o.courierConsignmentId).toBeUndefined();
      expect(o.save).not.toHaveBeenCalled();
    });
  });
});
