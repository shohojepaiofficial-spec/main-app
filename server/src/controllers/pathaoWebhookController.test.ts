import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({ findOne: vi.fn(), transitionOrder: vi.fn() }));
vi.mock("../models/Order", () => ({ Order: { findOne: mocks.findOne } }));
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
});
