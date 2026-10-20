import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

// Unsubscribing is a POST from the /unsubscribe page's button, signed per
// account; opening the emailed link alone changes nothing.
const state = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }));
vi.mock("../models/User", () => ({ User: { findById: async () => state.user } }));
import { unsubscribeFromMarketing } from "./authController";
import { generateUnsubscribeToken } from "../utils/campaignTokens";

const UID = "507f1f77bcf86cd799439011";
const request = (body: Record<string, unknown>) => ({ params: {}, query: {}, body, method: "POST" }) as unknown as Request;
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn() }; }

beforeAll(() => { process.env.JWT_SECRET ||= "test-secret"; });
beforeEach(() => { state.user = { marketingOptIn: { email: true, sms: true }, save: vi.fn() }; });

describe("unsubscribeFromMarketing", () => {
  it("turns off marketing email for a correctly signed request", async () => {
    const res = response();
    await unsubscribeFromMarketing(request({ uid: UID, token: generateUnsubscribeToken(UID) }), res as unknown as Response);
    expect(res.status).not.toHaveBeenCalled();
    expect(state.user!.marketingOptIn).toEqual({ email: false, sms: true });
  });

  it.each([
    ["a forged token", { uid: UID, token: "0".repeat(64) }],
    ["a malformed account id", { uid: "not-an-id", token: "x" }],
    ["a missing token", { uid: UID }],
  ])("refuses %s", async (_label, body) => {
    const res = response();
    await unsubscribeFromMarketing(request(body), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(400);
    expect((state.user!.marketingOptIn as { email: boolean }).email).toBe(true);
  });

  it("refuses unexpected fields", async () => {
    await expect(unsubscribeFromMarketing(request({ uid: UID, token: "x", email: true }), response() as unknown as Response))
      .rejects.toMatchObject({ status: 400 });
  });
});
