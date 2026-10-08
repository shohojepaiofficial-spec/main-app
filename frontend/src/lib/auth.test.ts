import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ default: (config: unknown) => ({ handlers: config }) }));
vi.mock("next-auth/providers/google", () => ({ default: {} }));
import * as authModule from "./auth";

// Capture the actual callback configuration without contacting OAuth or the API.
type Token = Record<string, unknown>;
const { callbacks } = authModule.handlers as unknown as {
  callbacks: {
    jwt: (args: { token: Token; account: { provider: string; providerAccountId: string }; user: { email: string }; profile: { email: string; email_verified: boolean } }) => Promise<Token>;
    session: (args: { session: Token; token: Token }) => Promise<Token>;
  };
};
afterEach(() => vi.unstubAllGlobals());

describe("Google backend exchange", () => {
  it("keeps credentials out of the public Google session callback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "access", refreshToken: "refresh", user: { id: "google-user" } }) }));
    const token = await callbacks.jwt({ token: {}, account: { provider: "google", providerAccountId: "id" }, user: { email: "google@example.com" }, profile: { email: "google@example.com", email_verified: true } });
    const session = await callbacks.session({ session: {}, token });
    expect(session).toMatchObject({ backendToken: "ui..not-a-credential", backendRefreshToken: "ui..not-a-credential", backendUser: { id: "google-user" } });
    expect(token.backendToken).toBe("access");
    expect(token.backendRefreshToken).toBe("refresh");
  });
  it("surfaces local-provider mismatch and removes stale credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ code: "LOCAL_LOGIN_REQUIRED" }) }));
    const token = await callbacks.jwt({
      token: { backendToken: "stale", backendRefreshToken: "stale-refresh", backendUser: { id: "old" }, twoFactorRequired: true, tempToken: "old-challenge" },
      account: { provider: "google", providerAccountId: "google-id" }, user: { email: "local@example.com" }, profile: { email: "local@example.com", email_verified: true },
    });
    expect(token.backendToken).toBeUndefined();
    expect(token.backendRefreshToken).toBeUndefined();
    expect(token.backendUser).toBeUndefined();
    expect(token.tempToken).toBeUndefined();
    const session = await callbacks.session({ session: {}, token });
    expect(session.backendAuthError).toBe("LOCAL_LOGIN_REQUIRED");
    expect(session.backendToken).toBeUndefined();
  });

  it("clears old sessions when the backend is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const token = await callbacks.jwt({ token: { backendToken: "stale" }, account: { provider: "google", providerAccountId: "id" }, user: { email: "google@example.com" }, profile: { email: "google@example.com", email_verified: true } });
    expect(token.backendToken).toBeUndefined();
    expect(token.backendAuthError).toBe("GOOGLE_SIGN_IN_FAILED");
  });

  it("carries a Google 2FA challenge without a previous access token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ twoFactorRequired: true, tempToken: "challenge" }) }));
    const token = await callbacks.jwt({ token: { backendToken: "stale" }, account: { provider: "google", providerAccountId: "id" }, user: { email: "admin@example.com" }, profile: { email: "admin@example.com", email_verified: true } });
    expect(token.backendToken).toBeUndefined();
    expect(token.tempToken).toBe("challenge");
    expect(token.twoFactorRequired).toBe(true);
  });

  it("rejects an unverified Google email before contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const token = await callbacks.jwt({ token: { backendToken: "stale" }, account: { provider: "google", providerAccountId: "id" }, user: { email: "test@example.com" }, profile: { email: "test@example.com", email_verified: false } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(token.backendToken).toBeUndefined();
    expect(token.backendAuthError).toBe("GOOGLE_SIGN_IN_FAILED");
  });
});
