import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../models/SharedCart", () => ({ SharedCart: { findById: vi.fn(), findOneAndUpdate: vi.fn() } }));
vi.mock("../models/Order", () => ({ Order: { findOne: vi.fn(), countDocuments: vi.fn(), create: vi.fn(), updateOne: vi.fn() } }));
vi.mock("../integrations/bkash", () => ({ isBkashLive: vi.fn(), createBkashPayment: vi.fn() }));
import { Types } from "mongoose";
import { SharedCart } from "../models/SharedCart";
import { Order } from "../models/Order";
import { isBkashLive } from "../integrations/bkash";
import { payForSharedCart } from "./sharedCartController";

const cartId = new Types.ObjectId().toString();
function response() {
  const res = { statusCode: 200, body: undefined as unknown, status(code: number) { res.statusCode = code; return res; }, json(body: unknown) { res.body = body; return res; } };
  return res;
}
const request = () => ({ body: {}, params: { id: cartId }, query: {}, method: "POST" }) as never;
const address = { fullName: "Rina", phone: "01712345678", zila: "Sylhet", upazila: "Sylhet Sadar", addressLine: "House 1" };
const cart = (overrides: Record<string, unknown> = {}) => ({
  _id: cartId, items: [], createdBy: new Types.ObjectId(), expiresAt: new Date(Date.now() + 60_000), shippingAddress: address, ...overrides,
});

beforeEach(() => { vi.clearAllMocks(); vi.mocked(isBkashLive).mockReturnValue(true); });

describe("paying a shared cart link", () => {
  it("shows coming soon until bKash is live", async () => {
    vi.mocked(isBkashLive).mockReturnValue(false);
    const res = response();
    await payForSharedCart(request(), res as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ code: "BKASH_UNAVAILABLE" });
    expect(SharedCart.findById).not.toHaveBeenCalled();
  });
  it("refuses an already-paid link and an old link without an address", async () => {
    vi.mocked(SharedCart.findById).mockResolvedValue(cart({ fulfilledOrder: new Types.ObjectId() }) as never);
    let res = response();
    await payForSharedCart(request(), res as never);
    expect(res.statusCode).toBe(409);
    vi.mocked(SharedCart.findById).mockResolvedValue(cart({ shippingAddress: undefined }) as never);
    res = response();
    await payForSharedCart(request(), res as never);
    expect(res.statusCode).toBe(410);
  });
  it("sends a retry back to the bKash page already open for this link", async () => {
    vi.mocked(SharedCart.findById).mockResolvedValue(cart({ claimedOrder: new Types.ObjectId() }) as never);
    vi.mocked(Order.findOne).mockResolvedValue({ bkashRedirectUrl: "https://bkash.example/pay" } as never);
    const res = response();
    await payForSharedCart(request(), res as never);
    expect(res.body).toEqual({ bkashRedirectUrl: "https://bkash.example/pay" });
    expect(Order.create).not.toHaveBeenCalled();
  });
});
