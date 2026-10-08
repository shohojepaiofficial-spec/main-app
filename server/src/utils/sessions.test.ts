import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";

vi.mock("../models/AuthSession", () => ({ AuthSession: { create: vi.fn(), exists: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() } }));
vi.mock("../models/User", () => ({ User: { findById: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() } }));
vi.mock("./sendEmail", () => ({ sendEmail: vi.fn() }));
import { AuthSession } from "../models/AuthSession";
import { User } from "../models/User";
import { createSession, isSessionActive, revokeSession, rotateSession } from "./sessions";
import { hashToken, verifyAccessToken, verifyTypedToken } from "./authTokens";
import { optionalAuth, protect, type AuthRequest } from "../middleware/auth";
import { changePassword, logoutAllSessions, logoutSession, resetPassword } from "../controllers/authController";
import { verifyTwoFactorLogin } from "../controllers/twoFactorController";
import { signTwoFactorChallenge } from "./twoFactor";

// An in-memory adapter exercises conditional filters and state transitions.
// These tests do not claim to exercise MongoDB's transaction/concurrency engine.
type Row = Record<string, unknown>;
let rows: Map<string, Row>;
let user: Row;
const id = "507f1f77bcf86cd799439011";
function matches(row: Row, filter: Row): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && "$gt" in value) return Number(row[key]) > Number(value.$gt);
    return row[key] === value || (value === null && row[key] == null);
  });
}
function update(row: Row, changes: Record<string, Row>) {
  Object.assign(row, changes.$set);
  for (const [key, value] of Object.entries(changes.$inc ?? {})) row[key] = Number(row[key] ?? 0) + Number(value);
  for (const key of Object.keys(changes.$unset ?? {})) delete row[key];
}
function query<T>(value: T) { return Object.assign(Promise.resolve(value), { select: () => Promise.resolve(value) }); }
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() }; }
async function issue(authenticatedAt?: number) { return createSession({ ...user } as unknown as InstanceType<typeof User>, authenticatedAt); }
async function gate(token: string) {
  const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
  const res = response(), next = vi.fn();
  await protect(req, res as unknown as Response, next);
  return { req, res, next };
}

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv("JWT_SECRET", "session-revocation-test-secret");
  rows = new Map();
  user = { _id: id, id, role: "user", provider: "local", sessionVersion: 0, name: "Test", email: "test@example.com", permissions: [],
    password: await bcrypt.hash("old-password", 4), twoFactor: { enabled: false } };
  user.comparePassword = (password: string) => bcrypt.compare(password, user.password as string);
  vi.mocked(User.findById).mockImplementation(() => query({ ...user }) as never);
  vi.mocked(User.findOne).mockImplementation((filter) => query(matches(user, filter as unknown as Row) ? { ...user } : null) as never);
  vi.mocked(User.findOneAndUpdate).mockImplementation((async (filter: Row, changes: Record<string, Row>) => {
    if (!matches(user, filter)) return null;
    update(user, changes);
    return { ...user };
  }) as never);
  vi.mocked(User.updateOne).mockImplementation((async (filter: Row, changes: Record<string, Row>) => {
    const matchedCount = matches(user, filter) ? 1 : 0;
    if (matchedCount) update(user, changes);
    return { matchedCount };
  }) as never);
  vi.mocked(AuthSession.create).mockImplementation(async (row: Row) => { rows.set(row._id as string, { ...row, revokedAt: null }); return row as never; });
  vi.mocked(AuthSession.exists).mockImplementation((filter) => query([...rows.values()].find((row) => matches(row, filter as unknown as Row))) as never);
  vi.mocked(AuthSession.findOneAndUpdate).mockImplementation((async (filter: Row, changes: Record<string, Row>) => {
    const row = [...rows.values()].find((entry) => matches(entry, filter));
    if (!row) return null;
    update(row, changes);
    return { ...row };
  }) as never);
  vi.mocked(AuthSession.updateOne).mockImplementation((async (filter: Row, changes: Record<string, Row>) => {
    const row = [...rows.values()].find((entry) => matches(entry, filter));
    if (row) update(row, changes);
    return { matchedCount: row ? 1 : 0 };
  }) as never);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("server-side session lifecycle", () => {
  it("issues 15-minute access and a seven-day absolute session, storing only the refresh hash", async () => {
    const session = await issue();
    const access = verifyTypedToken(session.token, "access"), refresh = verifyTypedToken(session.refreshToken, "refresh");
    expect(access.exp! - access.iat!).toBe(900);
    expect(refresh.exp! - refresh.iat!).toBe(604800);
    expect(rows.get(access.sid)).toMatchObject({ refreshTokenHash: hashToken(session.refreshToken), version: 0 });
    expect(JSON.stringify([...rows.values()])).not.toContain(session.refreshToken);
    expect((await gate(session.token)).req.userId).toBe(id);
  });

  it("rotates refresh credentials without extending expiry or fresh-authentication time", async () => {
    const signedInAt = Math.floor(Date.now() / 1000) - 600;
    const first = await issue(signedInAt);
    const second = await rotateSession(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.token).not.toBe(first.token);
    expect(verifyTypedToken(second.refreshToken, "refresh").exp).toBe(verifyTypedToken(first.refreshToken, "refresh").exp);
    expect(verifyAccessToken(second.token).authenticatedAt).toBe(signedInAt);
    expect((await gate(second.token)).req.userId).toBe(id);
  });

  it("revokes the whole session when a spent refresh token is replayed", async () => {
    const first = await issue(), second = await rotateSession(first.refreshToken);
    await expect(rotateSession(first.refreshToken)).rejects.toMatchObject({ code: "SESSION_REVOKED" });
    expect((await gate(second.token)).res.status).toHaveBeenCalledWith(401);
    await expect(rotateSession(second.refreshToken)).rejects.toThrow();
  });

  it("allows only one concurrent refresh and revokes the session upon reuse", async () => {
    const first = await issue();
    const results = await Promise.allSettled([rotateSession(first.refreshToken), rotateSession(first.refreshToken)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await isSessionActive(verifyAccessToken(first.token))).toBe(false);
  });

  it("does not let invalid signatures or the wrong token purpose revoke a session", async () => {
    const session = await issue();
    const claims = jwt.decode(session.refreshToken) as jwt.JwtPayload;
    const forged = jwt.sign(claims, "wrong-secret");
    for (const token of [forged, session.token, signTwoFactorChallenge(id)]) await expect(rotateSession(token)).rejects.toThrow();
    expect(AuthSession.updateOne).not.toHaveBeenCalled();
    expect((await gate(session.refreshToken)).res.status).toHaveBeenCalledWith(401);
    expect(await isSessionActive(verifyAccessToken(session.token))).toBe(true);
  });

  it("logout revokes this device's access and refresh while leaving another device active", async () => {
    const first = await issue(), second = await issue();
    const req = (await gate(first.token)).req;
    await logoutSession(req, response() as unknown as Response);
    expect((await gate(first.token)).res.status).toHaveBeenCalledWith(401);
    await expect(rotateSession(first.refreshToken)).rejects.toThrow();
    expect((await gate(second.token)).req.userId).toBe(id);
    await expect(rotateSession(second.refreshToken)).resolves.toHaveProperty("token");
  });

  it("logout-all invalidates access and refresh tokens on every device", async () => {
    const sessions = [await issue(), await issue()];
    await logoutAllSessions({ userId: id } as AuthRequest, response() as unknown as Response);
    for (const session of sessions) {
      expect((await gate(session.token)).res.status).toHaveBeenCalledWith(401);
      await expect(rotateSession(session.refreshToken)).rejects.toThrow();
    }
    expect((await gate((await issue()).token)).req.userId).toBe(id);
  });

  it.each(["expired", "missing", "revoked"])("rejects a %s session before the handler and keeps optional auth anonymous", async (state) => {
    const session = await issue(), claims = verifyAccessToken(session.token);
    if (state === "expired") rows.get(claims.sid)!.expiresAt = new Date(0);
    if (state === "missing") rows.delete(claims.sid);
    if (state === "revoked") await revokeSession(claims.sid, id);
    const result = await gate(session.token);
    expect(result.res.status).toHaveBeenCalledWith(401);
    expect(result.next).not.toHaveBeenCalled();
    const req = { headers: { authorization: `Bearer ${session.token}` } } as AuthRequest;
    await optionalAuth(req, response() as unknown as Response, vi.fn());
    expect(req.userId).toBeUndefined();
    await expect(rotateSession(session.refreshToken)).rejects.toThrow();
  });

  it("rejects a deleted user even when the session record remains", async () => {
    const session = await issue();
    vi.mocked(User.findById).mockReturnValue(query(null) as never);
    expect((await gate(session.token)).res.status).toHaveBeenCalledWith(401);
    await expect(rotateSession(session.refreshToken)).rejects.toThrow();
  });

  it("fails closed on database errors without misreporting a revoked session", async () => {
    const session = await issue(), failure = new Error("database unavailable");
    vi.mocked(AuthSession.exists).mockRejectedValueOnce(failure);
    const result = await gate(session.token);
    expect(result.req.userId).toBeUndefined();
    expect(result.next).toHaveBeenCalledWith(failure);
    expect(result.res.status).not.toHaveBeenCalled();
  });

  it("requires refresh after access expiry and refuses refresh after absolute expiry", async () => {
    vi.useFakeTimers();
    const session = await issue();
    vi.advanceTimersByTime(901_000);
    expect((await gate(session.token)).res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "ACCESS_TOKEN_EXPIRED" }));
    const rotated = await rotateSession(session.refreshToken);
    expect((await gate(rotated.token)).req.userId).toBe(id);
    vi.advanceTimersByTime(604800_000);
    await expect(rotateSession(rotated.refreshToken)).rejects.toThrow();
  });

  it("password change stores a bcrypt hash and immediately invalidates all prior credentials", async () => {
    const session = await issue(), res = response();
    await changePassword({ userId: id, body: { currentPassword: "old-password", newPassword: "new-password" } } as AuthRequest, res as unknown as Response);
    expect(await bcrypt.compare("new-password", user.password as string)).toBe(true);
    expect(user.sessionVersion).toBe(1);
    expect((await gate(session.token)).res.status).toHaveBeenCalledWith(401);
    await expect(rotateSession(session.refreshToken)).rejects.toThrow();
  });

  it("password reset is single-use and revokes old credentials before issuing a new session", async () => {
    user.resetPasswordTokenHash = hashToken("reset-link");
    user.resetPasswordExpires = new Date(Date.now() + 60000);
    const old = await issue(), res = response();
    const req = { body: { token: "reset-link", password: "new-password" } } as Request;
    // Both requests see the link; only the conditional update may consume it.
    await Promise.all([resetPassword(req, res as unknown as Response), resetPassword(req, res as unknown as Response)]);
    expect(user.sessionVersion).toBe(1);
    expect(res.status).toHaveBeenCalledExactlyOnceWith(400);
    expect((await gate(old.token)).res.status).toHaveBeenCalledWith(401);
    await expect(rotateSession(old.refreshToken)).rejects.toThrow();
    const fresh = res.json.mock.calls.map(([data]) => data).find((data) => data.token);
    expect((await gate(fresh.token)).req.userId).toBe(id);
    expect(verifyAccessToken(fresh.token).authenticatedAt).toBeUndefined();
  });

  it("invalidates a pending 2FA challenge when account sessions are revoked", async () => {
    const secret = authenticator.generateSecret();
    user.role = "admin";
    user.twoFactor = { enabled: true, secret };
    const challenge = signTwoFactorChallenge(id, undefined, 0);
    await logoutAllSessions({ userId: id } as AuthRequest, response() as unknown as Response);
    const res = response();
    await verifyTwoFactorLogin({ body: { tempToken: challenge, code: authenticator.generate(secret) } } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(AuthSession.create).not.toHaveBeenCalled();
  });
});
