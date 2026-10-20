import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";

vi.mock("../models/PushSubscription", () => ({ PushSubscription: { findOneAndUpdate: vi.fn(), find: vi.fn(), deleteMany: vi.fn() } }));
import { PushSubscription } from "../models/PushSubscription";
import { subscribePush, MAX_PUSH_DEVICES } from "./notificationController";
import type { AuthRequest } from "../middleware/auth";

describe("subscribePush device cap", () => {
  it("keeps only the newest devices for the account", async () => {
    const skip = vi.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ _id: "old1" }, { _id: "old2" }]) }) });
    vi.mocked(PushSubscription.find).mockReturnValue({ sort: () => ({ skip }) } as never);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const body = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "k", auth: "a" } };
    await subscribePush({ userId: "u1", body } as unknown as AuthRequest, res as unknown as Response);
    expect(PushSubscription.find).toHaveBeenCalledWith({ user: "u1" });
    expect(skip).toHaveBeenCalledWith(MAX_PUSH_DEVICES);
    expect(PushSubscription.deleteMany).toHaveBeenCalledWith({ _id: { $in: ["old1", "old2"] } });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
