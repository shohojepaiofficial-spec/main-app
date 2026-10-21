import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

// SEC-29: at most one reset email per account every 2 minutes, so the
// forgot-password form can't be used to flood someone's inbox.
const state = vi.hoisted(() => ({ user: null as Record<string, unknown> | null, sendEmail: vi.fn() }));
vi.mock("../models/User", () => ({ User: { findOne: () => ({ select: async () => state.user }) } }));
vi.mock("../utils/sendEmail", () => ({ sendEmail: state.sendEmail }));
import { forgotPassword } from "./authController";

const HOUR = 60 * 60 * 1000;
const request = () => ({ params: {}, query: {}, body: { email: "shopper@example.com" }, method: "POST" }) as unknown as Request;
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
const generic = { message: "If an account with that email exists, we've sent a password reset link." };

beforeEach(() => {
  state.sendEmail.mockReset().mockResolvedValue(undefined);
  state.user = { name: "Shopper", email: "shopper@example.com", save: vi.fn() };
});

describe("forgotPassword cooldown", () => {
  it("sends a reset email when none was sent recently", async () => {
    const res = response();
    await forgotPassword(request(), res as unknown as Response);
    expect(state.sendEmail).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith(generic);
  });

  it("sends nothing within 2 minutes of the last one, with the same reply", async () => {
    const firstHash = "existing-hash";
    // Sent 30 seconds ago: the link expires an hour after it was issued.
    Object.assign(state.user!, { resetPasswordTokenHash: firstHash, resetPasswordExpires: new Date(Date.now() - 30_000 + HOUR) });
    const res = response();
    await forgotPassword(request(), res as unknown as Response);
    expect(state.sendEmail).not.toHaveBeenCalled();
    expect(state.user!.save).not.toHaveBeenCalled();
    expect(state.user!.resetPasswordTokenHash).toBe(firstHash);
    expect(res.json).toHaveBeenCalledWith(generic);
  });

  it("sends again once the cooldown has passed", async () => {
    Object.assign(state.user!, { resetPasswordExpires: new Date(Date.now() - 3 * 60_000 + HOUR) });
    await forgotPassword(request(), response() as unknown as Response);
    expect(state.sendEmail).toHaveBeenCalledOnce();
  });
});
