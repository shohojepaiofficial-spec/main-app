import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ order: {} as Record<string, unknown>, inventory: 0, writes: [] as unknown[], fail: false }));
const session = vi.hoisted(() => ({ endSession: vi.fn(), withTransaction: vi.fn(async (run: () => Promise<unknown>) => {
  const snapshot = { ...state.order }; const stock = state.inventory;
  try { return await run(); } catch (err) { state.order = snapshot; state.inventory = stock; throw err; }
}) }));
vi.mock("mongoose", () => ({ default: { startSession: async () => session } }));
vi.mock("../models/Order", () => ({ Order: {
  findById: vi.fn(() => ({ session: async () => ({ ...state.order }) })),
  findOneAndUpdate: vi.fn(async (filter, update, options) => {
    expect(options.session).toBe(session);
    if (state.order.status !== filter.status) return null;
    Object.assign(state.order, update.$set); return { ...state.order };
  }),
} }));
vi.mock("../models/Product", () => ({ Product: { updateOne: vi.fn(async (_filter, update, options) => {
  expect(options.session).toBe(session); state.writes.push(update);
  if (state.fail) throw new Error("write failed");
  state.inventory += update.$inc.stock ?? 0;
  return { matchedCount: 1 };
}) } }));
vi.mock("../models/SharedCart", () => ({ SharedCart: { updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }) } }));
import { transitionOrder } from "./orderTransitions";
import { Product } from "../models/Product";

beforeEach(() => { vi.clearAllMocks(); state.order = { _id: "order", id: "order", status: "pending", user: "buyer", items: [{ product: "product", quantity: 2 }] }; state.inventory = 3; state.writes = []; state.fail = false; });
describe("transactional order transitions", () => {
  it("restores inventory once for repeated cancellation and refuses reopening", async () => {
    await transitionOrder("order", "cancelled"); await transitionOrder("order", "cancelled");
    expect(state.inventory).toBe(5); expect(Product.updateOne).toHaveBeenCalledOnce();
    await expect(transitionOrder("order", "paid")).rejects.toMatchObject({ status: 409 });
  });
  it("rolls back status and stock when inventory writes fail", async () => {
    state.fail = true;
    await expect(transitionOrder("order", "cancelled")).rejects.toThrow("write failed");
    expect(state.order.status).toBe("pending"); expect(state.inventory).toBe(3);
    expect(session.endSession).toHaveBeenCalledOnce();
  });
  it("refuses other owners and pending-only cancellation of paid orders", async () => {
    await expect(transitionOrder("order", "cancelled", { owner: "attacker" })).rejects.toMatchObject({ status: 403 });
    state.order.status = "paid";
    await expect(transitionOrder("order", "cancelled", { owner: "buyer", pendingOnly: true })).rejects.toMatchObject({ status: 409 });
    expect(Product.updateOne).not.toHaveBeenCalled();
  });
  it("requires gateway-confirmed failure before releasing an online payment", async () => {
    state.order.bkashPaymentID = "payment";
    await expect(transitionOrder("order", "cancelled")).rejects.toMatchObject({ status: 409 });
    await transitionOrder("order", "cancelled", { paymentFailed: true });
    expect(state.inventory).toBe(5);
  });
  it("restores variants and preorders with their separate counters", async () => {
    state.order.items = [{ product: "p", variant: "v", quantity: 2 }, { product: "p2", isPreorder: true, quantity: 3 }];
    await transitionOrder("order", "cancelled");
    expect(state.writes).toEqual([{ $inc: { "variants.$.stock": 2, stock: 2 } }, { $inc: { "preorder.reserved": -3 } }]);
  });
  it("refuses fulfillment of an unverified online payment", async () => {
    Object.assign(state.order, { source: "online", paymentMethod: "bkash" });
    for (const status of ["paid", "shipped", "delivered"] as const) await expect(transitionOrder("order", status)).rejects.toMatchObject({ status: 409 });
    expect(state.order.status).toBe("pending");
  });
});
