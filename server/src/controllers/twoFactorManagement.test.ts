import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Response } from "express";
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
vi.mock("../models/User", () => ({ User: { findById: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() } }));
vi.mock("../utils/sendEmail", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
import { User } from "../models/User";
import { protect, type AuthRequest } from "../middleware/auth";
import { hashToken, signAccessToken, verifyTypedToken } from "../utils/authTokens";
import { signTwoFactorChallenge } from "../utils/twoFactor";
import { setupTwoFactor, replaceTwoFactor, confirmTwoFactor, confirmTwoFactorReplacement, disableTwoFactor, verifyTwoFactorLogin } from "./twoFactorController";

const id = "507f1f77bcf86cd799439011";
const header = "Bearer management-session";
function account(enabled = true) {
  const secret = authenticator.generateSecret();
  return { id, role: "admin", email: "admin@example.com", twoFactor: {
    enabled, secret, backupCodeHashes: [] as string[], pendingSecret: authenticator.generateSecret(),
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
  vi.resetAllMocks();
  vi.stubEnv("JWT_SECRET", "management-test-secret");
  vi.mocked(User.updateOne).mockResolvedValue({ matchedCount: 1 } as never);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("SEC-02 factor management", () => {
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
      const req = request(authenticator.generate(user.twoFactor.secret));
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
    await replaceTwoFactor(request(authenticator.generate(user.twoFactor.secret)), res as unknown as Response);
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
    await confirmTwoFactorReplacement(request(authenticator.generate(user.twoFactor.pendingSecret)), res as unknown as Response);
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
    if (kind === "changed-factor") user.twoFactor.secret = authenticator.generateSecret();
    if (kind === "unbound") user.twoFactor.pendingFactorHash = undefined;
    load(user);
    const res = response();
    await confirmTwoFactorReplacement(request(authenticator.generate(user.twoFactor.pendingSecret)), res as unknown as Response);
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
    const code = authenticator.generate(handler === confirmTwoFactorReplacement ? user.twoFactor.pendingSecret : user.twoFactor.secret);
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
    await disableTwoFactor(request(authenticator.generate(user.twoFactor.secret)), res as unknown as Response);
    expect(User.updateOne).toHaveBeenCalledWith(expect.objectContaining({ "twoFactor.secret": user.twoFactor.secret, "twoFactor.enabled": true }), { $set: { twoFactor: { enabled: false } } });
    expect(res.json).toHaveBeenCalledWith({ message: "Two-step verification disabled" });
  });

  it("preserves the original authentication time through a delayed challenge exchange", async () => {
    vi.useFakeTimers();
    const original = Math.floor(Date.now() / 1000);
    const challenge = signTwoFactorChallenge(id, original);
    vi.setSystemTime(Date.now() + 240_000);
    const user = account();
    load(user);
    const res = response();
    await verifyTwoFactorLogin({ body: { tempToken: challenge, code: authenticator.generate(user.twoFactor.secret) } } as AuthRequest, res as unknown as Response);
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
