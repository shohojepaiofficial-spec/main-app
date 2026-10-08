import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import jwt from "jsonwebtoken";
import { protect, optionalAuth, adminOnly, authorize, type AuthRequest } from "./auth";
import { signAccessToken } from "../utils/authTokens";
import { signTwoFactorChallenge, verifyTwoFactorChallenge } from "../utils/twoFactor";
import { User } from "../models/User";

const id = "507f1f77bcf86cd799439011";
const secret = "security-regression-test-secret";

beforeEach(() => vi.stubEnv("JWT_SECRET", secret));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("token purpose boundaries", () => {
  it.each([
    ["admin", [], true],
    ["coadmin", ["orders:manage"], true],
    ["coadmin", [], false],
    ["user", ["orders:manage"], false],
    ["user", [], false],
  ])("checks current role %s and permissions %j", async (role, permissions, allowed) => {
    vi.spyOn(User, "findById").mockReturnValue({ select: () => Promise.resolve({ role, permissions }) } as never);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await authorize("orders:manage")({ userId: id, userRole: "admin" } as AuthRequest, res as unknown as express.Response, next);
    if (allowed) expect(next).toHaveBeenCalledOnce();
    else {
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });
  it("rejects challenges before customer and admin handlers run", async () => {
    const app = express();
    app.get("/customer", protect, (_req, res) => res.json({ ok: true }));
    app.get("/admin", protect, adminOnly, (_req, res) => res.json({ ok: true }));
    app.get("/coadmin", protect, authorize("orders:manage"), (_req, res) => res.json({ ok: true }));
    const server = app.listen(0, "127.0.0.1");
    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test port");
      for (const path of ["customer", "admin", "coadmin"]) {
        const response = await fetch(`http://127.0.0.1:${address.port}/${path}`, {
          headers: { Authorization: `Bearer ${signTwoFactorChallenge(id)}` },
        });
        expect(response.status).toBe(401);
      }
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    }
  });

  it("treats a challenge as anonymous in optionalAuth", () => {
    const req = { headers: { authorization: `Bearer ${signTwoFactorChallenge(id)}` } } as AuthRequest;
    const next = vi.fn();
    optionalAuth(req, {} as express.Response, next);
    expect(req.userId).toBeUndefined();
    expect(req.userRole).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it.each(["user", "coadmin", "admin"] as const)("accepts an access token for %s", (role) => {
    const req = { headers: { authorization: `Bearer ${signAccessToken(id, role)}` } } as AuthRequest;
    const next = vi.fn();
    protect(req, {} as express.Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe(id);
    expect(req.userRole).toBe(role);
    expect(verifyTwoFactorChallenge(signAccessToken(id, role))).toBeNull();
  });

  it.each([
    ["legacy", { id, role: "admin" }],
    ["unknown purpose", { id, role: "admin", purpose: "reset" }],
    ["bad ID", { id: "invalid", role: "admin", purpose: "access" }],
    ["bad role", { id, role: "superadmin", purpose: "access" }],
  ])("rejects %s claims", (_label, claims) => {
    const token = jwt.sign(claims, secret, { expiresIn: "5m" });
    const status = vi.fn().mockReturnThis();
    const next = vi.fn();
    protect({ headers: { authorization: `Bearer ${token}` } } as AuthRequest,
      { status, json: vi.fn() } as unknown as express.Response, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects expired, unsigned-expiry, malformed and wrong-key tokens", () => {
    const claims = { id, role: "admin", purpose: "access" };
    for (const token of [
      jwt.sign(claims, secret, { expiresIn: -1 }),
      jwt.sign(claims, secret),
      jwt.sign(claims, "wrong-key", { expiresIn: "5m" }),
      "not-a-jwt",
    ]) {
      const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
      const status = vi.fn().mockReturnThis();
      const next = vi.fn();
      protect(req, { status, json: vi.fn() } as unknown as express.Response, next);
      expect(status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      optionalAuth(req, {} as express.Response, next);
      expect(req.userId).toBeUndefined();
    }
    expect(verifyTwoFactorChallenge(signTwoFactorChallenge(id))).toBe(id);
    expect(verifyTwoFactorChallenge(jwt.sign({ id: "bad", purpose: "2fa" }, secret, { expiresIn: "5m" }))).toBeNull();
  });
});
