import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Request } from "express";
import { twoFactorChallengeKey } from "./rateLimit";
import { signTwoFactorChallenge } from "../utils/twoFactor";
import { signTestAccessToken } from "../testUtils/auth";

// SEC-23: the second sign-in step is limited per account, not only per IP,
// so many IPs can't share the guessing of one person's code.
describe("twoFactorChallengeKey", () => {
  beforeEach(() => vi.stubEnv("JWT_SECRET", "limiter-test-secret"));
  afterEach(() => vi.unstubAllEnvs());
  const req = (body: unknown, ip: string) => ({ body, ip, headers: {}, get: () => undefined, socket: { remoteAddress: ip } }) as unknown as Request;

  it("keys a sign-in by its account, whatever the IP", () => {
    const tempToken = signTwoFactorChallenge("507f1f77bcf86cd799439011");
    expect(twoFactorChallengeKey(req({ tempToken }, "10.0.0.1"))).toBe("2fa:507f1f77bcf86cd799439011");
    expect(twoFactorChallengeKey(req({ tempToken }, "10.0.0.2"))).toBe("2fa:507f1f77bcf86cd799439011");
    expect(twoFactorChallengeKey(req({ tempToken: signTwoFactorChallenge("507f1f77bcf86cd799439012") }, "10.0.0.1"))).toBe("2fa:507f1f77bcf86cd799439012");
  });

  it("falls back to the IP for a missing or wrong-purpose token", () => {
    const ipKey = twoFactorChallengeKey(req({}, "10.0.0.9"));
    expect(ipKey).not.toMatch(/^2fa:/);
    expect(twoFactorChallengeKey(req({ tempToken: "garbage" }, "10.0.0.9"))).toBe(ipKey);
    expect(twoFactorChallengeKey(req({ tempToken: signTestAccessToken("507f1f77bcf86cd799439011", "admin") }, "10.0.0.9"))).toBe(ipKey);
  });
});
