import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { Request } from "express";
import { clientIpKey } from "./clientIp";
beforeEach(() => vi.stubEnv("INTERNAL_API_SECRET", "test-internal-secret"));
afterEach(() => vi.unstubAllEnvs());
function request(headers: Record<string, string>) { return { ip: "127.0.0.1", get: (key: string) => headers[key] } as unknown as Request; }
function signed(ip = "203.0.113.8", time = Date.now()) {
  const timestamp = String(time);
  return { "X-Client-IP": ip, "X-Client-IP-Time": timestamp, "X-Client-IP-Signature": createHmac("sha256", "test-internal-secret").update(`client-ip:${timestamp}:${ip}`).digest("hex") };
}
describe("trusted client rate-limit identity", () => {
  it("accepts a fresh signed IP", () => expect(clientIpKey(request(signed()))).toBe("203.0.113.8"));
  it("ignores unsigned forwarded headers", () => expect(clientIpKey(request({ "X-Forwarded-For": "203.0.113.8", "X-Client-IP": "203.0.113.8" }))).toBe("127.0.0.1"));
  it("rejects tampered and stale signatures", () => {
    expect(clientIpKey(request({ ...signed(), "X-Client-IP": "203.0.113.9" }))).toBe("127.0.0.1");
    expect(clientIpKey(request(signed(undefined, Date.now() - 61_000)))).toBe("127.0.0.1");
  });
  it("does not accept signed non-IP values", () => expect(clientIpKey(request(signed("not-an-ip")))).toBe("127.0.0.1"));
});
