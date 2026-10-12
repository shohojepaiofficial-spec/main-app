import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { storefrontOnly } from "./storefrontOnly";

beforeEach(() => { vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("INTERNAL_API_SECRET", "test-internal-secret"); });
afterEach(() => vi.unstubAllEnvs());
function run(path: string, secret?: string) {
  const req = { path, get: (key: string) => key === "X-Internal-Secret" ? secret : undefined } as unknown as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  storefrontOnly(req, res as unknown as Response, next);
  return { res, next };
}

describe("storefront-only API access", () => {
  it("lets the storefront through", () => expect(run("/products", "test-internal-secret").next).toHaveBeenCalledOnce());
  it("refuses direct requests with a missing or wrong secret", () => {
    for (const secret of [undefined, "", "wrong", "test-internal-secret-x"]) {
      const { res, next } = run("/products", secret);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });
  it("keeps the health check and the bKash return open", () => {
    expect(run("/health").next).toHaveBeenCalledOnce();
    expect(run("/orders/bkash/callback").next).toHaveBeenCalledOnce();
  });
  it("refuses everything when the secret is not configured", () => {
    vi.stubEnv("INTERNAL_API_SECRET", "");
    expect(run("/products", "").next).not.toHaveBeenCalled();
  });
  it("is off outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(run("/products").next).toHaveBeenCalledOnce();
  });
});
