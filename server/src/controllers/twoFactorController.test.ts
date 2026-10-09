vi.mock("../models/AuthSession", () => ({ AuthSession: { create: vi.fn().mockResolvedValue({}), exists: vi.fn().mockResolvedValue({ _id: "session" }) } }));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptSecret, decryptSecret } from "../utils/secretEncryption";
import type { Request, Response } from "express";
import { authenticator } from "otplib";

vi.mock("../models/User", () => ({ User: { findById: vi.fn(), findOne: vi.fn(), create: vi.fn(), updateOne: vi.fn(), findOneAndUpdate: vi.fn() } }));
vi.mock("../utils/sendEmail", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
import { User } from "../models/User";
import { AuthSession } from "../models/AuthSession";
import { login, oauthSync, register, resetPassword } from "./authController";
import { setupTwoFactor, confirmTwoFactor, disableTwoFactor, verifyTwoFactorLogin } from "./twoFactorController";
import { verifyAccessToken, hashToken, verifyTypedToken } from "../utils/authTokens";
import { signTestAccessToken as signAccessToken } from "../testUtils/auth";
import { signTwoFactorChallenge, verifyTwoFactorChallenge } from "../utils/twoFactor";
import type { AuthRequest } from "../middleware/auth";

const id = "507f1f77bcf86cd799439011";
function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
}
function account(role: "user" | "admin" | "coadmin", enabled = false) {
  return {
    id, role, provider: "local", name: "Test", email: "test@example.com", permissions: [],
    twoFactor: { enabled, secret: encryptSecret(authenticator.generateSecret()), pendingSecret: encryptSecret(authenticator.generateSecret()), pendingExpires: new Date(Date.now() + 60_000), pendingSessionHash: hashToken("Bearer management-session") },
    comparePassword: vi.fn().mockResolvedValue(true), save: vi.fn().mockResolvedValue(undefined),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TOTP_ALLOW_LEGACY_PLAINTEXT", "false");
  vi.stubEnv("JWT_SECRET", "controller-regression-secret");
  vi.stubEnv("TOTP_ENCRYPTION_KEY_ID", "test");
  vi.stubEnv("TOTP_ENCRYPTION_KEYS", JSON.stringify({ test: Buffer.alloc(32, 1).toString("base64") }));
  vi.mocked(User.updateOne).mockResolvedValue({ matchedCount: 1 } as never);
});
afterEach(() => vi.unstubAllEnvs());

describe("login and restricted 2FA enrollment", () => {
  it("does not treat password recovery as recent primary sign-in", async () => {
    const user = account("admin", true);
    vi.mocked(User.findOne).mockReturnValue({ select: () => Promise.resolve(user) } as never);
    const res = response();
    vi.mocked(User.findOneAndUpdate).mockResolvedValueOnce({ ...user, sessionVersion: 1 } as never);
    await resetPassword({ body: { token: "reset-link", password: "new-password" } } as Request, res as unknown as Response);
    expect(res.json.mock.calls[0][0].twoFactorRequired).toBe(true);
    expect(verifyTypedToken(res.json.mock.calls[0][0].tempToken, "2fa").authenticatedAt).toBeUndefined();
  });
  it("creates a Google account for a new email", async () => {
    const user = { ...account("user"), provider: "google" };
    vi.mocked(User.findOne).mockResolvedValueOnce(null);
    vi.mocked(User.create).mockResolvedValueOnce(user as never);
    const res = response();
    await oauthSync({ body: { email: user.email, name: user.name, provider: "google", providerId: "google-id" } } as Request, res as unknown as Response);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ provider: "google", providerId: "google-id" }));
    expect(verifyAccessToken(res.json.mock.calls[0][0].token)).toMatchObject({ id, role: "user" });
  });
  it("rejects Google login to a local account without changing it", async () => {
    const user = account("admin", true);
    vi.mocked(User.findOne).mockResolvedValueOnce(user as never);
    const res = response();
    await oauthSync({ body: { email: user.email, provider: "google", providerId: "google-id" } } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].code).toBe("LOCAL_LOGIN_REQUIRED");
    expect(res.json.mock.calls[0][0].token).toBeUndefined();
    expect(user.save).not.toHaveBeenCalled();
  });

  it("rejects password login to a Google account", async () => {
    const user = { ...account("user"), provider: "google" };
    vi.mocked(User.findOne).mockReturnValue({ select: () => Promise.resolve(user) } as never);
    const res = response();
    await login({ body: { email: user.email, password: "test-password" } } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].code).toBe("GOOGLE_LOGIN_REQUIRED");
    expect(user.comparePassword).not.toHaveBeenCalled();
  });

  it.each(["user", "admin", "coadmin"] as const)("allows matching Google account for %s with the appropriate factor policy", async (role) => {
    const user = { ...account(role, true), provider: "google", providerId: "google-id", image: "avatar" };
    vi.mocked(User.findOne).mockResolvedValueOnce(user as never);
    const res = response();
    await oauthSync({ body: { email: user.email, provider: "google", providerId: "google-id" } } as Request, res as unknown as Response);
    const data = res.json.mock.calls[0][0];
    if (role === "user") {
      expect(verifyAccessToken(data.token)).toMatchObject({ id, role });
      expect(data.user.twoFactorEnabled).toBe(false);
    } else {
      expect(data.twoFactorRequired).toBe(true);
      expect(verifyTwoFactorChallenge(data.tempToken)).toBe(id);
    }
  });

  it("does not challenge a customer with legacy 2FA settings", async () => {
    const user = account("user", true);
    vi.mocked(User.findOne).mockReturnValue({ select: () => Promise.resolve(user) } as never);
    const res = response();
    await login({ body: { email: user.email, password: "test-password" } } as Request, res as unknown as Response);
    expect(verifyAccessToken(res.json.mock.calls[0][0].token)).toMatchObject({ id, role: "user" });
    expect(res.json.mock.calls[0][0].user.twoFactorEnabled).toBe(false);
  });

  it("rejects a pending 2FA exchange after demotion to customer", async () => {
    const user = account("user", true);
    vi.mocked(User.findById).mockReturnValue({ select: () => Promise.resolve(user) } as never);
    const res = response();
    await verifyTwoFactorLogin({ body: { tempToken: signTwoFactorChallenge(id), code: authenticator.generate(decryptSecret(user.twoFactor.secret)) } } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].token).toBeUndefined();
  });
  it("issues an access token after ordinary password login", async () => {
    const user = account("user");
    vi.mocked(User.findOne).mockReturnValue({ select: () => Promise.resolve(user) } as never);
    const res = response();
    await login({ body: { email: user.email, password: "test-password" } } as Request, res as unknown as Response);
    expect(verifyAccessToken(res.json.mock.calls[0][0].token)).toMatchObject({ id, role: "user" });
    expect(verifyTypedToken(res.json.mock.calls[0][0].refreshToken, "refresh")).toMatchObject({ id, version: 0 });
    expect(AuthSession.create).toHaveBeenCalledOnce();
  });

  it.each(["admin", "coadmin"] as const)("requires second factor and issues a usable session for %s", async (role) => {
    const user = account(role, true);
    vi.mocked(User.findOne).mockReturnValue({ select: () => Promise.resolve(user) } as never);
    vi.mocked(User.findById).mockReturnValue({ select: () => Promise.resolve(user) } as never);
    const first = response();
    await login({ body: { email: user.email, password: "test-password" } } as Request, first as unknown as Response);
    const challenge = first.json.mock.calls[0][0];
    expect(challenge.twoFactorRequired).toBe(true);
    expect(challenge.token).toBeUndefined();
    expect(challenge.refreshToken).toBeUndefined();
    expect(AuthSession.create).not.toHaveBeenCalled();
    expect(verifyTwoFactorChallenge(challenge.tempToken)).toBe(id);
    expect(() => verifyAccessToken(challenge.tempToken)).toThrow();
    const second = response();
    await verifyTwoFactorLogin({ body: { tempToken: challenge.tempToken, code: authenticator.generate(decryptSecret(user.twoFactor.secret)) } } as Request,
      second as unknown as Response);
    expect(verifyAccessToken(second.json.mock.calls[0][0].token)).toMatchObject({ id, role });
    expect(verifyTypedToken(second.json.mock.calls[0][0].refreshToken, "refresh")).toMatchObject({ id, version: 0 });
    expect(AuthSession.create).toHaveBeenCalledOnce();
  });

  it("does not issue a session for an incorrect second factor", async () => {
    const user = account("admin", true);
    vi.mocked(User.findById).mockReturnValue({ select: () => Promise.resolve(user) } as never);
    const res = response();
    await verifyTwoFactorLogin({ body: { tempToken: signTwoFactorChallenge(id), code: "invalid-code" } } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].token).toBeUndefined();
  });

  it("rejects an access token at the challenge exchange before querying a user", async () => {
    const res = response();
    await verifyTwoFactorLogin({ body: { tempToken: signAccessToken(id, "admin"), code: "123456" } } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("rejects customer setup and confirmation without modifying their account", async () => {
    const user = account("user");
    vi.mocked(User.findById).mockReturnValueOnce({ select: () => Promise.resolve(user) } as never);
    const setup = response();
    await setupTwoFactor({ authenticatedAt: Math.floor(Date.now() / 1000), headers: { authorization: "Bearer management-session" }, userId: id } as AuthRequest, setup as unknown as Response);
    expect(setup.status).toHaveBeenCalledWith(403);
    vi.mocked(User.findById).mockReturnValueOnce({ select: () => Promise.resolve(user) } as never);
    const confirm = response();
    await confirmTwoFactor({ authenticatedAt: Math.floor(Date.now() / 1000), headers: { authorization: "Bearer management-session" }, userId: id, body: { code: "123456" } } as AuthRequest, confirm as unknown as Response);
    expect(confirm.status).toHaveBeenCalledWith(403);
    expect(user.save).not.toHaveBeenCalled();
  });

  it.each(["admin", "coadmin"] as const)("allows initial setup for %s", async (role) => {
    const user = account(role);
    vi.mocked(User.findById).mockReturnValueOnce({ select: () => Promise.resolve(user) } as never);
    const res = response();
    await setupTwoFactor({ authenticatedAt: Math.floor(Date.now() / 1000), headers: { authorization: "Bearer management-session" }, userId: id } as AuthRequest, res as unknown as Response);
    expect(User.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ "twoFactor.enabled": { $ne: true } }),
      expect.objectContaining({ $set: expect.objectContaining({ "twoFactor.pendingSecret": expect.stringMatching(/^enc:v1:/) }) }),
    );
    const stored = vi.mocked(User.updateOne).mock.calls[0][1] as { $set: { "twoFactor.pendingSecret": string } };
    expect(decryptSecret(stored.$set["twoFactor.pendingSecret"])).toBe(res.json.mock.calls[0][0].secret);
    expect(user.twoFactor.enabled).toBe(false);
  });

  it("directs Google accounts to Google when registering with a password", async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce({ ...account("user"), provider: "google" } as never);
    const res = response();
    await register({ body: { name: "Test", email: " TEST@EXAMPLE.COM ", password: "password" } } as Request, res as unknown as Response);
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "GOOGLE_LOGIN_REQUIRED" }));
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejects a different Google identity with the same email", async () => {
    const user = { ...account("admin"), provider: "google", providerId: "original-id" };
    vi.mocked(User.findOne).mockResolvedValueOnce(user as never);
    const res = response();
    await oauthSync({ body: { email: " TEST@EXAMPLE.COM ", provider: "google", providerId: "different-id" } } as Request, res as unknown as Response);
    expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(user.save).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].token).toBeUndefined();
  });

  it.each(["admin", "coadmin"] as const)("blocks overwriting enabled 2FA for %s", async (role) => {
    const user = account(role, true);
    vi.mocked(User.findById).mockReturnValueOnce({ select: () => Promise.resolve(user) } as never);
    const setup = response();
    await setupTwoFactor({ authenticatedAt: Math.floor(Date.now() / 1000), headers: { authorization: "Bearer management-session" }, userId: id } as AuthRequest, setup as unknown as Response);
    expect(setup.status).toHaveBeenCalledWith(409);
    vi.mocked(User.findById).mockReturnValueOnce({ select: () => Promise.resolve(user) } as never);
    const confirm = response();
    await confirmTwoFactor({ authenticatedAt: Math.floor(Date.now() / 1000), headers: { authorization: "Bearer management-session" }, userId: id, body: { code: authenticator.generate(decryptSecret(user.twoFactor.pendingSecret)) } } as AuthRequest, confirm as unknown as Response);
    expect(confirm.status).toHaveBeenCalledWith(409);
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it("rejects customer disabling even with a legacy factor", async () => {
    const user = account("user", true);
    vi.mocked(User.findById).mockReturnValueOnce({ select: () => Promise.resolve(user) } as never);
    const res = response();
    await disableTwoFactor({ authenticatedAt: Math.floor(Date.now() / 1000), headers: { authorization: "Bearer management-session" }, userId: id, body: { code: authenticator.generate(decryptSecret(user.twoFactor.secret)) } } as AuthRequest, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(user.save).not.toHaveBeenCalled();
  });

  it.each([1, 0])("confirms enrollment only if the pending setup still matches (matched=%s)", async (matchedCount) => {
    const user = account("admin");
    vi.mocked(User.findById).mockReturnValueOnce({ select: () => Promise.resolve(user) } as never);
    vi.mocked(User.updateOne).mockResolvedValueOnce({ matchedCount } as never);
    const res = response();
    await confirmTwoFactor({ authenticatedAt: Math.floor(Date.now() / 1000), headers: { authorization: "Bearer management-session" }, userId: id, body: { code: authenticator.generate(decryptSecret(user.twoFactor.pendingSecret)) } } as AuthRequest, res as unknown as Response);
    expect(User.updateOne).toHaveBeenCalledWith(expect.objectContaining({
      "twoFactor.enabled": { $ne: true }, "twoFactor.pendingSecret": user.twoFactor.pendingSecret,
    }), expect.any(Object));
    if (matchedCount) expect(res.json.mock.calls[0][0].backupCodes).toHaveLength(10);
    else {
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].backupCodes).toBeUndefined();
    }
  });
});
