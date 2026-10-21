import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Request } from "express";
import { isStorefrontRender } from "./rateLimit";
import application from "../app";

// SEC-29: the storefront's own page renders have no visitor IP, so they used
// to share Railway's edge-proxy buckets with anyone hitting the open paths.
beforeEach(() => vi.stubEnv("INTERNAL_API_SECRET", "test-internal-secret"));
afterEach(() => vi.unstubAllEnvs());

function request(headers: Record<string, string>) {
  return { ip: "10.0.0.1", get: (key: string) => headers[key] } as unknown as Request;
}
function signedIp(ip = "203.0.113.8") {
  const timestamp = String(Date.now());
  return { "X-Client-IP": ip, "X-Client-IP-Time": timestamp, "X-Client-IP-Signature": createHmac("sha256", "test-internal-secret").update(`client-ip:${timestamp}:${ip}`).digest("hex") };
}

describe("isStorefrontRender", () => {
  it("recognises a server-side render by the secret alone", () => {
    expect(isStorefrontRender(request({ "X-Internal-Secret": "test-internal-secret" }))).toBe(true);
  });
  it("never treats a browser request through the proxy as a render", () => {
    expect(isStorefrontRender(request({ "X-Internal-Secret": "test-internal-secret", "X-Storefront-Proxy": "1" }))).toBe(false);
    // An older proxy without the marker still signs the visitor's IP.
    expect(isStorefrontRender(request({ "X-Internal-Secret": "test-internal-secret", ...signedIp() }))).toBe(false);
  });
  it("refuses a missing or wrong secret", () => {
    expect(isStorefrontRender(request({}))).toBe(false);
    expect(isStorefrontRender(request({ "X-Internal-Secret": "wrong" }))).toBe(false);
    vi.stubEnv("INTERNAL_API_SECRET", "");
    expect(isStorefrontRender(request({ "X-Internal-Secret": "" }))).toBe(false);
  });
});

describe("health check", () => {
  it("answers without the secret and without counting against the rate limit", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const server = application.listen(0, "127.0.0.1");
    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok" });
      expect(response.headers.get("ratelimit-remaining")).toBeNull();
    } finally {
      server.close();
    }
  });
});
