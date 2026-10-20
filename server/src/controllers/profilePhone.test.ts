import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";

// The Settings phone prefills checkout and receives marketing SMS, so it
// must be a real Bangladeshi mobile, stored in one spelling.
const state = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }));
vi.mock("../models/User", () => ({ User: { findById: async () => state.user } }));
import { updateProfile } from "./authController";

const request = (phone: string) => ({ userId: "u1", params: {}, body: { phone } }) as unknown as AuthRequest;
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn() }; }

beforeEach(() => {
  state.user = { id: "u1", name: "Rahim", phone: "01711111111", role: "user", marketingOptIn: {}, save: vi.fn() };
});

describe("updateProfile phone", () => {
  it("stores any spelling of a BD mobile as 01XXXXXXXXX", async () => {
    const res = response();
    await updateProfile(request("+880 1712-345678"), res as unknown as Response);
    expect(res.status).not.toHaveBeenCalled();
    expect(state.user!.phone).toBe("01712345678");
    expect(state.user!.save).toHaveBeenCalled();
  });

  it.each(["hello", "12345", "01712345678".repeat(5)])("refuses %s", async (phone) => {
    const res = response();
    await updateProfile(request(phone), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(state.user!.phone).toBe("01711111111");
    expect(state.user!.save).not.toHaveBeenCalled();
  });

  it("clears the phone when sent empty", async () => {
    const res = response();
    await updateProfile(request("  "), res as unknown as Response);
    expect(state.user!.phone).toBeUndefined();
  });
});
