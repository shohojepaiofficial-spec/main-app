vi.mock("../models/AuthSession", () => ({ AuthSession: { create: vi.fn().mockResolvedValue({}), exists: vi.fn().mockResolvedValue({ _id: "session" }) } }));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Response } from "express";
import { authenticator } from "otplib";
import { encryptSecret, decryptSecret } from "../utils/secretEncryption";
import bcrypt from "bcryptjs";
vi.mock("../models/User", () => ({ User: { findById: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() } }));
vi.mock("../utils/sendEmail", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../utils/errorMonitoring", () => ({ reportError: vi.fn() }));
import { User } from "../models/User";
import { AuthSession } from "../models/AuthSession";
import application from "../app";
import { reportError } from "../utils/errorMonitoring";
import { protect, type AuthRequest } from "../middleware/auth";
import { hashToken, verifyTypedToken } from "../utils/authTokens";
import { signTestAccessToken as signAccessToken } from "../testUtils/auth";
import { signTwoFactorChallenge } from "../utils/twoFactor";
import { setupTwoFactor, replaceTwoFactor, confirmTwoFactor, confirmTwoFactorReplacement, disableTwoFactor, verifyTwoFactorLogin } from "./twoFactorController";

const id = "507f1f77bcf86cd799439011";
const header = "Bearer management-session";
function account(enabled = true) {
  const secret = encryptSecret(authenticator.generateSecret());
  return { id, role: "admin", email: "admin@example.com", twoFactor: {
    enabled, secret, backupCodeHashes: [] as string[], pendingSecret: encryptSecret(authenticator.generateSecret()),
    pendingExpires: new Date(Date.now() + 60_000), pendingSessionHash: hashToken(header),
    pendingFactorHash: enabled ? hashToken(secret) : undefined,
  } };
}
function request(code?: string, authenticatedAt: number | undefined = Math.floor(Date.now() / 1000)) {
  return { userId: id, authenticatedAt, headers: { authorization: header }, body: { code } } as AuthRequest;
}
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() }; }
function load(user: ReturnType<typeof account>) {
  vi.mocked(User.findById).mockReturnValue({ select: () => Promise.resolve(user) } as never);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TOTP_ALLOW_LEGACY_PLAINTEXT", "false");
  vi.stubEnv("JWT_SECRET", "management-test-secret");
  vi.stubEnv("TOTP_ENCRYPTION_KEY_ID", "test");
  vi.stubEnv("TOTP_ENCRYPTION_KEYS", JSON.stringify({ test: Buffer.alloc(32, 1).toString("base64") }));
  vi.mocked(User.updateOne).mockResolvedValue({ matchedCount: 1 } as never);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("SEC-02 factor management", () => {
  it("restores legacy authenticator login only when the migration flag is explicitly enabled", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T00:00:00Z"));
    vi.stubEnv("NODE_ENV", "development");
    const user = account();
    user.twoFactor.secret = decryptSecret(user.twoFactor.secret);
    vi.stubEnv("TOTP_ENCRYPTION_KEYS", "{}");
    load(user);
    const req = { body: { tempToken: signTwoFactorChallenge(id), code: authenticator.generate(user.twoFactor.secret) } } as AuthRequest;
    const rejected = response();
    await expect(verifyTwoFactorLogin(req, rejected as unknown as Response)).rejects.toMatchObject({ status: 503 });
    expect(AuthSession.create).not.toHaveBeenCalled();
    vi.stubEnv("TOTP_ALLOW_LEGACY_PLAINTEXT", "true");
    const accepted = response();
    await verifyTwoFactorLogin(req, accepted as unknown as Response);
    expect(verifyTypedToken(accepted.json.mock.calls[0][0].token, "access")).toMatchObject({ id, role: "admin" });
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it("returns a safe configuration error over HTTP while retaining single-use backup recovery", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T00:00:00Z"));
    const user = account();
    const code = authenticator.generate(decryptSecret(user.twoFactor.secret));
    user.twoFactor.backupCodeHashes = [bcrypt.hashSync("ABCDE-12345", 4)];
    vi.stubEnv("TOTP_ENCRYPTION_KEYS", "{}");
    load(user);
    const server = application.listen(0, "127.0.0.1");
    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing port");
      const send = (input: string) => fetch(`http://127.0.0.1:${address.port}/api/auth/2fa/verify-login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken: signTwoFactorChallenge(id), code: input }),
      });
      const unavailable = await send(code);
      expect(unavailable.status).toBe(503);
      expect(unavailable.headers.get("cache-control")).toBe("no-store");
      expect(await unavailable.json()).toEqual({ code: "TWO_FACTOR_UNAVAILABLE", message: "Authenticator codes are temporarily unavailable. Use an unused backup code or contact the store administrator." });
      expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }), expect.any(Object));
      expect(AuthSession.create).not.toHaveBeenCalled();
      const recovered = await send("ABCDE-12345");
      expect(recovered.status).toBe(200);
      const recoveredSession = await recovered.json() as { token: string };
      expect(verifyTypedToken(recoveredSession.token, "access")).toMatchObject({ id, role: "admin" });
      expect(User.updateOne).toHaveBeenCalledWith(expect.objectContaining({ "twoFactor.backupCodeHashes": user.twoFactor.backupCodeHashes[0] }), { $pull: { "twoFactor.backupCodeHashes": user.twoFactor.backupCodeHashes[0] } });
      vi.mocked(User.updateOne).mockResolvedValueOnce({ matchedCount: 0 } as never);
      expect((await send("ABCDE-12345")).status).toBe(401);
      expect(AuthSession.create).toHaveBeenCalledOnce();
      vi.mocked(User.findById).mockImplementationOnce(() => { throw new Error("private database details"); });
      const unexpected = await send(code);
      expect(unexpected.status).toBe(500);
      expect(await unexpected.json()).toEqual({ message: "Service unavailable. Please try again." });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("gives separate logins distinct session bindings even within the same second", () => {
    expect(signAccessToken(id, "admin")).not.toBe(signAccessToken(id, "admin"));
  });

  it.each([replaceTwoFactor, confirmTwoFactorReplacement])("rejects customer replacement", async (handler) => {
    const user = account();
    user.role = "user";
    load(user);
    const res = response();
    await handler(request("123456"), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(User.updateOne).not.toHaveBeenCalled();
  });
  it.each([
    ["setup", setupTwoFactor, false], ["confirm", confirmTwoFactor, false],
    ["replace", replaceTwoFactor, true], ["replace confirm", confirmTwoFactorReplacement, true],
    ["disable", disableTwoFactor, true],
  ] as const)("%s requires recent sign-in even when the code is correct", async (_name, handler, enabled) => {
    const user = account(enabled);
    load(user);
    for (const timestamp of [undefined, Math.floor(Date.now() / 1000) - 300, Math.floor(Date.now() / 1000) + 60]) {
      const req = request(authenticator.generate(decryptSecret(user.twoFactor.secret)));
      req.authenticatedAt = timestamp;
      const res = response();
      await handler(req, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(428);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "REAUTHENTICATION_REQUIRED" }));
    }
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it.each([undefined, "wrong-code"])("rejects replacement without the existing factor (%s)", async (code) => {
    load(account());
    const res = response();
    await replaceTwoFactor(request(code), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it.each(["admin", "coadmin"])("starts replacement for %s while leaving the active factor and backup codes intact", async (role) => {
    const user = account();
    user.role = role;
    load(user);
    const res = response();
    await replaceTwoFactor(request(authenticator.generate(decryptSecret(user.twoFactor.secret))), res as unknown as Response);
    const [filter, update] = vi.mocked(User.updateOne).mock.calls[0] as unknown as [Record<string, unknown>, { $set: Record<string, unknown> }];
    expect(filter).toMatchObject({ "twoFactor.enabled": true, "twoFactor.secret": user.twoFactor.secret, role: { $in: ["admin", "coadmin"] } });
    expect(update.$set).toMatchObject({ "twoFactor.pendingFactorHash": hashToken(user.twoFactor.secret), "twoFactor.pendingSessionHash": hashToken(header) });
    expect(update.$set["twoFactor.secret"]).toBeUndefined();
    expect(update.$set["twoFactor.enabled"]).toBeUndefined();
    expect(update.$set["twoFactor.backupCodeHashes"]).toBeUndefined();
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.json.mock.calls[0][0].backupCodes).toBeUndefined();
  });

  it.each(["admin", "coadmin"])("confirms replacement for %s atomically and rotates backup codes", async (role) => {
    const user = account();
    user.role = role;
    load(user);
    const res = response();
    await confirmTwoFactorReplacement(request(authenticator.generate(decryptSecret(user.twoFactor.pendingSecret))), res as unknown as Response);
    expect(User.updateOne).toHaveBeenCalledWith(expect.objectContaining({
      "twoFactor.secret": user.twoFactor.secret, "twoFactor.pendingSecret": user.twoFactor.pendingSecret,
      "twoFactor.pendingFactorHash": hashToken(user.twoFactor.secret), "twoFactor.pendingSessionHash": hashToken(header),
    }), expect.objectContaining({ $set: {
      "twoFactor.enabled": true, "twoFactor.secret": user.twoFactor.pendingSecret,
      "twoFactor.backupCodeHashes": expect.any(Array),
    }, $unset: expect.objectContaining({ "twoFactor.pendingSecret": 1, "twoFactor.pendingFactorHash": 1 }) }));
    expect(res.json.mock.calls[0][0].backupCodes).toHaveLength(10);
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it.each(["expired", "other-session", "changed-factor", "unbound"])("rejects %s pending replacement", async (kind) => {
    const user = account();
    if (kind === "expired") user.twoFactor.pendingExpires = new Date(Date.now() - 1);
    if (kind === "other-session") user.twoFactor.pendingSessionHash = hashToken("another session");
    if (kind === "changed-factor") user.twoFactor.secret = encryptSecret(authenticator.generateSecret());
    if (kind === "unbound") user.twoFactor.pendingFactorHash = undefined;
    load(user);
    const res = response();
    await confirmTwoFactorReplacement(request(authenticator.generate(decryptSecret(user.twoFactor.pendingSecret))), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it("does not finish replacement with an invalid new code", async () => {
    const user = account();
    load(user);
    const res = response();
    await confirmTwoFactorReplacement(request("wrong-code"), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it.each([replaceTwoFactor, confirmTwoFactorReplacement, disableTwoFactor])("rejects a concurrent factor change", async (handler) => {
    const user = account();
    load(user);
    vi.mocked(User.updateOne).mockResolvedValueOnce({ matchedCount: 0 } as never);
    const code = authenticator.generate(decryptSecret(handler === confirmTwoFactorReplacement ? user.twoFactor.pendingSecret : user.twoFactor.secret));
    const res = response();
    await handler(request(code), res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].backupCodes).toBeUndefined();
  });

  it("consumes a backup code once across simultaneous replacement attempts", async () => {
    const user = account();
    const backupHash = bcrypt.hashSync("ABCDE-12345", 4);
    user.twoFactor.backupCodeHashes = [backupHash];
    load(user);
    vi.mocked(User.updateOne).mockResolvedValueOnce({ matchedCount: 1 } as never).mockResolvedValueOnce({ matchedCount: 0 } as never);
    const first = response(), second = response();
    await Promise.all([replaceTwoFactor(request("ABCDE-12345"), first as unknown as Response), replaceTwoFactor(request("ABCDE-12345"), second as unknown as Response)]);
    expect(User.updateOne).toHaveBeenCalledWith(expect.objectContaining({ "twoFactor.backupCodeHashes": backupHash }), expect.objectContaining({ $pull: { "twoFactor.backupCodeHashes": backupHash } }));
    const replies = [first, second];
    expect(replies.filter((res) => res.json.mock.calls[0][0].secret)).toHaveLength(1);
    expect(replies.filter((res) => res.status.mock.calls[0]?.[0] === 409)).toHaveLength(1);
  });

  it("rejects a backup login code consumed by another request", async () => {
    const user = account();
    user.twoFactor.backupCodeHashes = [bcrypt.hashSync("ABCDE-12345", 4)];
    load(user);
    vi.mocked(User.updateOne).mockResolvedValueOnce({ matchedCount: 0 } as never);
    const res = response();
    await verifyTwoFactorLogin({ body: { tempToken: signTwoFactorChallenge(id), code: "ABCDE-12345" } } as AuthRequest, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].token).toBeUndefined();
  });

  it("disables only the factor that was verified and clears pending replacement", async () => {
    const user = account();
    load(user);
    const res = response();
    await disableTwoFactor(request(authenticator.generate(decryptSecret(user.twoFactor.secret))), res as unknown as Response);
    expect(User.updateOne).toHaveBeenCalledWith(expect.objectContaining({ "twoFactor.secret": user.twoFactor.secret, "twoFactor.enabled": true }), { $set: { twoFactor: { enabled: false } }, $inc: { sessionVersion: 1 } });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Two-step verification disabled", refreshToken: expect.any(String) }));
  });

  it("preserves the original authentication time through a delayed challenge exchange", async () => {
    vi.useFakeTimers();
    const original = Math.floor(Date.now() / 1000);
    const challenge = signTwoFactorChallenge(id, original);
    vi.setSystemTime(Date.now() + 240_000);
    const user = account();
    load(user);
    const res = response();
    await verifyTwoFactorLogin({ body: { tempToken: challenge, code: authenticator.generate(decryptSecret(user.twoFactor.secret)) } } as AuthRequest, res as unknown as Response);
    const claims = verifyTypedToken(res.json.mock.calls[0][0].token, "access");
    expect(claims.authenticatedAt).toBe(original);
    expect(claims.iat).toBe(original + 240);
  });

  it("enforces recent authentication from the signed token over HTTP", async () => {
    load(account());
    const app = express();
    app.use(express.json());
    app.post("/replace", protect, replaceTwoFactor);
    const server = app.listen(0, "127.0.0.1");
    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing port");
      for (const authenticatedAt of [undefined, Math.floor(Date.now() / 1000) - 301]) {
        const result = await fetch(`http://127.0.0.1:${address.port}/replace`, {
          method: "POST", headers: { Authorization: `Bearer ${signAccessToken(id, "admin", authenticatedAt)}`, "Content-Type": "application/json" },
          body: JSON.stringify({ code: "123456", authenticatedAt: Math.floor(Date.now() / 1000) }),
        });
        expect(result.status).toBe(428);
      }
      expect(User.updateOne).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
