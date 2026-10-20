import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";

// GET /orders/:id must not reveal whether someone else's order exists.
const state = vi.hoisted(() => ({ order: null as Record<string, unknown> | null, requester: { role: "user", permissions: [] as string[] } }));
vi.mock("../models/Order", () => ({ Order: {
  findById: () => { const chain = { populate: () => chain, then: (resolve: (v: unknown) => unknown) => resolve(state.order) }; return chain; },
} }));
vi.mock("../models/User", () => ({ User: { findById: () => ({ select: async () => state.requester }) } }));
vi.mock("../utils/customerOrder", () => ({ customerOrderView: (order: Record<string, unknown>) => ({ view: "customer", id: order.id }) }));
import { getOrderById } from "./orderController";

const ORDER_ID = "507f1f77bcf86cd799439011";
const request = (userId: string) => ({ userId, params: { id: ORDER_ID }, body: {} }) as unknown as AuthRequest;
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn() }; }

beforeEach(() => {
  state.order = { id: ORDER_ID, user: { _id: { toString: () => "owner" } } };
  state.requester = { role: "user", permissions: [] };
});

describe("getOrderById", () => {
  it("shows the owner their order", async () => {
    const res = response();
    await getOrderById(request("owner"), res as unknown as Response);
    expect(res.json).toHaveBeenCalledWith({ view: "customer", id: ORDER_ID });
  });

  it("gives another customer the same 404 as a missing order", async () => {
    const other = response();
    await getOrderById(request("stranger"), other as unknown as Response);
    state.order = null;
    const missing = response();
    await getOrderById(request("stranger"), missing as unknown as Response);

    expect(other.status).toHaveBeenCalledWith(404);
    expect(missing.status).toHaveBeenCalledWith(404);
    expect(other.json.mock.calls[0][0]).toEqual(missing.json.mock.calls[0][0]);
  });

  it("lets staff with orders:manage see anyone's order", async () => {
    state.requester = { role: "coadmin", permissions: ["orders:manage"] };
    const res = response();
    await getOrderById(request("staff"), res as unknown as Response);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(state.order);
  });
});
