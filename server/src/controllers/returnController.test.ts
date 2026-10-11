import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../models/Order", () => ({ Order: { findById: vi.fn(), exists: vi.fn() } }));
vi.mock("../models/ReturnRequest", async (original) => ({
  ...(await original<typeof import("../models/ReturnRequest")>()),
  ReturnRequest: { find: vi.fn(), findById: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn(), aggregate: vi.fn() },
}));
vi.mock("../integrations/bkash", () => ({ isBkashLive: vi.fn(), refundBkashPayment: vi.fn() }));
vi.mock("../utils/sendEmail", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
import { Types } from "mongoose";
import { Order } from "../models/Order";
import { ReturnRequest } from "../models/ReturnRequest";
import { isBkashLive, refundBkashPayment } from "../integrations/bkash";
import { createReturnRequest, recordRefund, refundWithBkash } from "./returnController";

const userId = new Types.ObjectId().toString();
const orderId = new Types.ObjectId().toString();
const returnId = new Types.ObjectId().toString();

function response() {
  const res = { statusCode: 200, body: undefined as unknown, status(code: number) { res.statusCode = code; return res; }, json(body: unknown) { res.body = body; return res; } };
  return res;
}
const request = (body: unknown, params: Record<string, string> = {}) => ({ body, params, query: {}, method: "POST", userId }) as never;
const delivered = (overrides: Record<string, unknown> = {}) => ({
  _id: orderId, user: { toString: () => userId }, status: "delivered", deliveredAt: new Date(), updatedAt: new Date(),
  items: [{ product: { _id: new Types.ObjectId(), name: "Mug" }, quantity: 1, price: 500 }], ...overrides,
});
const mockOrder = (order: unknown) => vi.mocked(Order.findById).mockReturnValue({ populate: () => Promise.resolve(order), then: (r: (v: unknown) => unknown) => Promise.resolve(order).then(r) } as never);
const body = { orderId, type: "return", reason: "damaged", items: [{ orderItemIndex: 0, quantity: 1 }] };

beforeEach(() => { vi.clearAllMocks(); vi.mocked(ReturnRequest.find).mockReturnValue({ select: () => Promise.resolve([]) } as never); });

describe("customer return requests", () => {
  it("hides other customers' orders behind a 404", async () => {
    mockOrder(delivered({ user: { toString: () => "someone-else" } }));
    const res = response();
    await createReturnRequest(request(body), res as never);
    expect(res.statusCode).toBe(404);
  });
  it("refuses undelivered orders and orders past the 7-day window", async () => {
    mockOrder(delivered({ status: "shipped" }));
    let res = response();
    await createReturnRequest(request(body), res as never);
    expect(res.statusCode).toBe(409);
    mockOrder(delivered({ deliveredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }));
    res = response();
    await createReturnRequest(request(body), res as never);
    expect(res.body).toMatchObject({ message: expect.stringContaining("window") });
  });
  it("needs to know what an exchange should be swapped for", async () => {
    mockOrder(delivered());
    const res = response();
    await createReturnRequest(request({ ...body, type: "exchange" }), res as never);
    expect(res.statusCode).toBe(400);
  });
  it("creates a request for a delivered order inside the window", async () => {
    mockOrder(delivered());
    vi.mocked(ReturnRequest.create).mockResolvedValue({ _id: returnId } as never);
    const res = response();
    await createReturnRequest(request(body), res as never);
    expect(res.statusCode).toBe(201);
    expect(ReturnRequest.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: "customer", type: "return" }));
  });
});

describe("refunds", () => {
  const approved = { _id: returnId, id: returnId, type: "return", status: "received", order: orderId };
  beforeEach(() => {
    vi.mocked(ReturnRequest.findById).mockResolvedValue(approved as never);
    vi.mocked(Order.findById).mockResolvedValue({ _id: orderId, totalAmount: 1000, paymentMethod: "bkash", bkashPaymentID: "P1", bkashTrxID: "T1" } as never);
    vi.mocked(ReturnRequest.aggregate).mockReturnValue({ session: () => Promise.resolve([{ total: 600 }]) } as never);
  });
  it("shows bKash refunds as coming soon until bKash is live", async () => {
    vi.mocked(isBkashLive).mockReturnValue(false);
    const res = response();
    await refundWithBkash(request({ amount: 100 }, { id: returnId }), res as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ code: "BKASH_REFUND_UNAVAILABLE" });
    expect(refundBkashPayment).not.toHaveBeenCalled();
  });
  it("caps a refund at what the order still has left after earlier refunds", async () => {
    const res = response();
    await recordRefund(request({ amount: 500, method: "cash" }, { id: returnId }), res as never);
    expect(res.statusCode).toBe(400);
    expect(ReturnRequest.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it("records a manual refund and completes a received request in one conditional write", async () => {
    vi.mocked(ReturnRequest.findOneAndUpdate).mockResolvedValue({ ...approved, status: "completed" } as never);
    const res = response();
    await recordRefund(request({ amount: 400, method: "bkash_personal", reference: "TRX9" }, { id: returnId }), res as never);
    expect(res.statusCode).toBe(200);
    expect(ReturnRequest.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: returnId, status: "received", refund: { $exists: false } }),
      expect.objectContaining({ $set: expect.objectContaining({ status: "completed", refund: expect.objectContaining({ amount: 400, method: "bkash_personal" }) }) }),
      expect.anything(),
    );
  });
  it("keeps the in-flight claim when bKash doesn't answer, so nobody refunds twice", async () => {
    vi.mocked(isBkashLive).mockReturnValue(true);
    vi.mocked(ReturnRequest.findOneAndUpdate).mockResolvedValueOnce(approved as never);
    vi.mocked(refundBkashPayment).mockRejectedValue(new Error("timeout"));
    const res = response();
    await refundWithBkash(request({ amount: 100 }, { id: returnId }), res as never);
    expect(res.statusCode).toBe(502);
    expect(ReturnRequest.updateOne).not.toHaveBeenCalled();
  });
});
