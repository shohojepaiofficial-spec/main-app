import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
const state = vi.hoisted(() => ({ orders: [] as Record<string, any>[], stock: 10, cart: null as Record<string, any> | null, verified: true, queue: Promise.resolve() as Promise<unknown> }));
vi.mock("mongoose", async importOriginal => {
  const actual = await importOriginal<typeof import("mongoose")>();
  return { ...actual, default: { ...actual.default, startSession: async () => ({ endSession: vi.fn(), withTransaction: (run: () => Promise<unknown>) => {
    const next = state.queue.catch(() => {}).then(async () => {
      const snapshot = structuredClone({ orders: state.orders, stock: state.stock, cart: state.cart });
      try { return await run(); } catch (error) { Object.assign(state, snapshot); throw error; }
    });
    state.queue = next; return next;
  } }) } };
});
vi.mock("../models/User", () => ({ User: { findById: () => ({ select: async () => ({ provider: "local", isEmailVerified: state.verified }) }) } }));
vi.mock("../models/Product", () => ({ Product: {
  find: () => ({ session: async () => [{ id: "507f1f77bcf86cd799439011", name: "Test", price: 100, stock: state.stock, options: [], variants: [], deliveryFeeInsideCity: 0, deliveryFeeOutsideCity: 0 }] }),
  updateOne: async (_filter: unknown, update: { $inc: { stock: number } }) => { state.stock += update.$inc.stock; return { modifiedCount: 1 }; },
} }));
vi.mock("../models/Order", () => ({ Order: {
  findOne: async (query: Record<string, unknown>) => state.orders.find(o => o.user === query.user && o.idempotencyKey === query.idempotencyKey) ?? null,
  create: async ([data]: Record<string, any>[]) => {
    if (state.orders.some(o => o.user === data.user && o.idempotencyKey === data.idempotencyKey)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const order = { ...data, _id: `order-${state.orders.length}`, id: `order-${state.orders.length}`, status: "pending" };
    state.orders.push(order); return [order];
  },
} }));
vi.mock("../models/SharedCart", () => ({ SharedCart: {
  findOne: () => ({ session: async () => state.cart && !state.cart.claimedOrder && !state.cart.fulfilledOrder && state.cart.expiresAt > new Date() ? state.cart : null }),
  findOneAndUpdate: async (_filter: unknown, update: { $set: Record<string, unknown> }) => {
    if (!state.cart || state.cart.claimedOrder) return null;
    Object.assign(state.cart, update.$set); return state.cart;
  },
} }));
import { createOrder } from "./orderController";

const item = { productId: "507f1f77bcf86cd799439011", quantity: 2 };
function request(key = "same-key-123456789", changes = {}) {
  return { userId: "buyer", params: {}, body: { items: [item], shippingAddress: { fullName: "Buyer", phone: "01700000000", zila: "Dhaka", upazila: "Dhaka", addressLine: "Test street" }, ...changes }, get: () => key } as unknown as AuthRequest;
}
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn() }; }
beforeEach(() => { state.orders = []; state.stock = 10; state.cart = null; state.verified = true; state.queue = Promise.resolve(); });
describe("checkout security", () => {
  it("creates one order and reservation for concurrent duplicate keys", async () => {
    const first = response(), second = response();
    await Promise.all([createOrder(request(), first as unknown as Response), createOrder(request(), second as unknown as Response)]);
    expect(state.orders).toHaveLength(1); expect(state.stock).toBe(8);
    expect(first.json.mock.calls[0][0].id).toBe(second.json.mock.calls[0][0].id);
  });
  it("rejects key reuse with a different payload", async () => {
    await createOrder(request(), response() as unknown as Response);
    const res = response();
    await createOrder(request(undefined, { items: [{ ...item, quantity: 3 }] }), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(409); expect(state.stock).toBe(8);
  });
  it("allows only one payer to fulfill a shared cart", async () => {
    state.cart = { items: [{ product: item.productId, quantity: 2 }], expiresAt: new Date(Date.now() + 60000) };
    const input = { sharedCartId: "507f1f77bcf86cd799439012" };
    const first = response(), second = response();
    await Promise.all([createOrder(request("first-key-123456789", input), first as unknown as Response), createOrder(request("second-key-123456789", input), second as unknown as Response)]);
    expect(state.orders).toHaveLength(1); expect(state.stock).toBe(8);
    expect(state.cart.fulfilledOrder).toBe(state.orders[0]._id);
    expect(second.status).toHaveBeenCalledWith(409);
  });
  it("rejects altered shared carts without reserving inventory", async () => {
    state.cart = { items: [{ product: item.productId, quantity: 1 }], expiresAt: new Date(Date.now() + 60000) };
    const res = response();
    await createOrder(request(undefined, { sharedCartId: "507f1f77bcf86cd799439012" }), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(400); expect(state.stock).toBe(10);
  });
  it("rejects checkout for unverified accounts", async () => {
    state.verified = false; const res = response();
    await createOrder(request(), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(403); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "EMAIL_VERIFICATION_REQUIRED" }));
    expect(state.orders).toHaveLength(0);
  });
});
