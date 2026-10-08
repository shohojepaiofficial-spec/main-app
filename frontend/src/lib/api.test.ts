import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InternalAxiosRequestConfig } from "axios";

const state = vi.hoisted(() => ({ currentToken: "old-access", ensure: vi.fn(), write: vi.fn() }));
vi.mock("js-cookie", () => ({ default: { get: () => state.currentToken } }));
vi.mock("./sessionClient", () => ({ ensureSession: state.ensure, writeSessionCookies: state.write }));
import { api } from "./api";

beforeEach(() => { vi.resetAllMocks(); state.currentToken = "old-access"; });
function rejected(config: InternalAxiosRequestConfig, code: string) { return Promise.reject({ config, response: { status: 401, data: { code } } }); }

describe("authenticated API requests", () => {
  it("refreshes an expired access token and retries the request once", async () => {
    state.ensure.mockImplementation(async (rejectedToken?: string) => {
      if (rejectedToken) state.currentToken = "new-access";
      return { token: state.currentToken };
    });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.headers.Authorization === "Bearer old-access") return rejected(config, "ACCESS_TOKEN_EXPIRED");
      return { config, status: 200, statusText: "OK", headers: {}, data: { ok: true } };
    });
    const result = await api.get("/auth/me", { adapter });
    expect(result.data.ok).toBe(true);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(state.ensure).toHaveBeenCalledWith("old-access");
  });

  it("does not retry indefinitely when refreshed access is also rejected", async () => {
    state.ensure.mockResolvedValue({ token: "old-access" });
    const adapter = vi.fn((config: InternalAxiosRequestConfig) => rejected(config, "ACCESS_TOKEN_EXPIRED"));
    await expect(api.get("/auth/me", { adapter })).rejects.toBeDefined();
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it("clears a revoked session without attempting refresh", async () => {
    state.ensure.mockResolvedValue({ token: "old-access" });
    await expect(api.get("/auth/me", { adapter: (config) => rejected(config, "SESSION_REVOKED") })).rejects.toBeDefined();
    expect(state.write).toHaveBeenCalledWith(null);
    expect(state.ensure).toHaveBeenCalledOnce();
  });

  it("does not clear a new session when an earlier request returns a revocation", async () => {
    state.ensure.mockResolvedValue({ token: "old-access" });
    await expect(api.get("/auth/me", { adapter: (config) => {
      state.currentToken = "new-access";
      return rejected(config, "SESSION_REVOKED");
    } })).rejects.toBeDefined();
    expect(state.write).not.toHaveBeenCalled();
  });

  it("permits signing in without waiting for an old session to refresh", async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({ config, status: 200, statusText: "OK", headers: {}, data: {} }));
    await api.post("/auth/login", { email: "test@example.com", password: "password" }, { adapter });
    expect(state.ensure).not.toHaveBeenCalled();
    expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
  });
});
