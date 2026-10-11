import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";

vi.mock("../models/AuthSession", () => ({ AuthSession: { find: vi.fn(), updateOne: vi.fn(), exists: vi.fn() } }));
vi.mock("../models/User", () => ({ User: { findById: vi.fn() } }));
vi.mock("../utils/sendEmail", () => ({ sendEmail: vi.fn() }));
import { AuthSession } from "../models/AuthSession";
import { User } from "../models/User";
import { sendEmail } from "../utils/sendEmail";
import { listSessions, revokeSessionById } from "./sessionController";
import { alertIfNewDevice } from "../utils/signInAlert";
import { describeDevice } from "../utils/deviceLabel";
import type { AuthRequest } from "../middleware/auth";

const userId = "507f1f77bcf86cd799439011";
const current = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() }; }
const request = (params: Record<string, string> = {}) => ({ userId, sessionId: current, params, method: "GET" }) as unknown as AuthRequest;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(User.findById).mockReturnValue({ select: () => Promise.resolve({ sessionVersion: 3 }) } as never);
});

describe("describeDevice", () => {
  it("reads common browsers and systems", () => {
    expect(describeDevice(CHROME_WIN)).toEqual({ browser: "Chrome", os: "Windows", mobile: false });
    expect(describeDevice(SAFARI_IOS)).toEqual({ browser: "Safari", os: "iOS", mobile: true });
    expect(describeDevice(`${SAFARI_IOS} [FBAN/FBIOS;FBAV/400.0]`).browser).toBe("Facebook app");
    expect(describeDevice(undefined)).toEqual({ browser: null, os: null, mobile: false });
  });
});

describe("listSessions", () => {
  it("lists only usable sessions for the caller and marks the current one", async () => {
    const lean = vi.fn().mockResolvedValue([
      { _id: current, userAgent: CHROME_WIN, ip: "203.0.113.8", createdAt: new Date(1), lastUsedAt: new Date(2) },
      { _id: other, createdAt: new Date(1) },
    ]);
    const chain = { select: () => chain, sort: () => chain, limit: () => ({ lean }) };
    vi.mocked(AuthSession.find).mockReturnValue(chain as never);
    const res = response();
    await listSessions(request(), res as unknown as Response);

    const filter = vi.mocked(AuthSession.find).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(filter).toMatchObject({ user: userId, version: 3, revokedAt: null });
    const body = res.json.mock.calls[0][0];
    expect(body[0]).toMatchObject({ id: current, browser: "Chrome", os: "Windows", ip: "203.0.113.8", current: true });
    expect(body[1]).toMatchObject({ id: other, browser: null, current: false, lastActiveAt: new Date(1) });
    expect(JSON.stringify(body)).not.toContain("refreshTokenHash");
  });
});

describe("revokeSessionById", () => {
  it("revokes another of the caller's own active sessions", async () => {
    vi.mocked(AuthSession.updateOne).mockResolvedValue({ matchedCount: 1 } as never);
    const res = response();
    await revokeSessionById({ ...request({ sid: other }), method: "DELETE" } as AuthRequest, res as unknown as Response);
    expect(AuthSession.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: other, user: userId, version: 3, revokedAt: null }), { $set: { revokedAt: expect.any(Date) } });
    expect(res.json).toHaveBeenCalledWith({ message: "Device signed out" });
  });

  it("refuses the current session, malformed ids, and sessions it doesn't own", async () => {
    for (const sid of [current, "not-a-uuid"]) {
      const res = response();
      await revokeSessionById(request({ sid }), res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    vi.mocked(AuthSession.updateOne).mockResolvedValue({ matchedCount: 0 } as never);
    const res = response();
    await revokeSessionById(request({ sid: other }), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("alertIfNewDevice", () => {
  const user = { id: userId, name: "Rahim <b>", email: "rahim@example.com" } as never;

  it("emails when an existing account signs in from an unseen browser", async () => {
    vi.mocked(AuthSession.exists).mockImplementation(((filter: Record<string, unknown>) => Promise.resolve("userAgent" in filter ? null : { _id: other })) as never);
    alertIfNewDevice(user, current, { userAgent: SAFARI_IOS, ip: "203.0.113.8" });
    await flush();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = vi.mocked(sendEmail).mock.calls[0][0];
    expect(mail.to).toBe("rahim@example.com");
    expect(mail.text).toContain("Safari on iOS");
    expect(mail.html).toContain("Rahim &lt;b&gt;");
  });

  it("stays quiet for a known browser or the account's first session", async () => {
    vi.mocked(AuthSession.exists).mockResolvedValue({ _id: other } as never);
    alertIfNewDevice(user, current, { userAgent: CHROME_WIN });
    vi.mocked(AuthSession.exists).mockResolvedValueOnce(null as never);
    alertIfNewDevice(user, current, { userAgent: CHROME_WIN });
    alertIfNewDevice(user, current, {});
    await flush();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
