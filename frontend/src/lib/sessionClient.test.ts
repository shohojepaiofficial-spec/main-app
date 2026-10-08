import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/models";

const cookies = vi.hoisted(() => new Map<string, string>());
vi.mock("js-cookie", () => ({ default: {
  get: (key: string) => cookies.get(key),
  set: vi.fn((key: string, value: string) => cookies.set(key, value)),
  remove: (key: string) => cookies.delete(key),
} }));
import Cookies from "js-cookie";
import { endSession, ensureSession, readSessionCookies, writeSessionCookies, type SessionCredentials } from "./sessionClient";

const fetchMock = vi.fn();
function token(seconds: number, nonce = "initial") {
  return `ui.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds, nonce })).toString("base64url")}.not-a-credential`;
}
function credentials(fresh = false, id = "user-1"): SessionCredentials {
  return { token: token(fresh ? 900 : -1), refreshToken: token(604800), user: { id } as User };
}
function ok(session: SessionCredentials) { return { ok: true, status: 200, json: async () => session }; }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  cookies.clear();
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("localStorage", { setItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("browser session lifecycle", () => {
  it("does not refresh a fresh access token", async () => {
    const session = credentials(true);
    writeSessionCookies(session);
    expect(await ensureSession()).toEqual(session);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares one refresh across concurrent requests and saves rotated credentials", async () => {
    const first = credentials(), rotated = { ...credentials(true), refreshToken: token(604800, "rotated") };
    writeSessionCookies(first);
    fetchMock.mockResolvedValueOnce(ok(rotated));
    expect(await Promise.all([ensureSession(), ensureSession(), ensureSession()])).toEqual([rotated, rotated, rotated]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refreshToken: first.refreshToken });
    expect(readSessionCookies()).toEqual(rotated);
  });

  it("rechecks cookies after another tab releases the browser lock", async () => {
    writeSessionCookies(credentials());
    const otherTab = { ...credentials(true), refreshToken: token(604800, "other-tab") };
    const request = vi.fn(async (_name: string, work: () => Promise<unknown>) => {
      writeSessionCookies(otherTab);
      return work();
    });
    vi.stubGlobal("navigator", { locks: { request } });
    expect(await ensureSession()).toEqual(otherTab);
    expect(request).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can force refresh for an access token rejected as expired by the server", async () => {
    const first = credentials(true), rotated = { ...first, token: token(900, "rotated") };
    writeSessionCookies(first);
    fetchMock.mockResolvedValueOnce(ok(rotated));
    expect(await ensureSession(first.token)).toEqual(rotated);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("clears credentials when refresh is revoked", async () => {
    writeSessionCookies(credentials());
    fetchMock.mockResolvedValueOnce({ status: 401, ok: false });
    expect(await ensureSession()).toBeNull();
    expect(readSessionCookies()).toBeNull();
  });

  it("clears expired refresh credentials without sending them", async () => {
    writeSessionCookies({ ...credentials(), refreshToken: token(-1) });
    expect(await ensureSession()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readSessionCookies()).toBeNull();
  });

  it.each(["network", "server"])("retains credentials on a temporary %s failure", async (failure) => {
    const first = credentials();
    writeSessionCookies(first);
    if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("offline"));
    else fetchMock.mockResolvedValueOnce({ status: 503, ok: false });
    await expect(ensureSession()).rejects.toThrow();
    expect(readSessionCookies()).toEqual(first);
  });

  it.each(["logout", "account-switch"])("cannot undo %s when a refresh response arrives late", async (change) => {
    writeSessionCookies(credentials());
    const pending = deferred<ReturnType<typeof ok>>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const refreshing = ensureSession();
    const current = change === "logout" ? null : { ...credentials(true, "user-2"), refreshToken: token(604800, "new-account") };
    writeSessionCookies(current);
    pending.resolve(ok(credentials(true)));
    await expect(refreshing).rejects.toThrow("Session changed");
    expect(readSessionCookies()).toEqual(current);
  });

  it("rejects a response containing another user's credentials", async () => {
    const first = credentials();
    writeSessionCookies(first);
    fetchMock.mockResolvedValueOnce(ok(credentials(true, "user-2")));
    await expect(ensureSession()).rejects.toThrow("Invalid session refresh response");
    expect(readSessionCookies()).toEqual(first);
  });

  it.each([false, true])("revokes the session before clearing cookies (all devices: %s)", async (allDevices) => {
    const first = credentials(true);
    writeSessionCookies(first);
    const pending = deferred<{ ok: boolean; status: number }>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const ending = endSession(allDevices);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(readSessionCookies()).toEqual(first);
    expect(fetchMock.mock.calls[0][0]).toMatch(allDevices ? /\/auth\/logout-all$/ : /\/auth\/logout$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers["X-Requested-With"]).toBe("ecommerce");
    pending.resolve({ ok: true, status: 200 });
    await ending;
    expect(readSessionCookies()).toBeNull();
  });

  it("reports logout failure and preserves credentials for retry", async () => {
    const first = credentials(true);
    writeSessionCookies(first);
    fetchMock.mockResolvedValueOnce({ status: 503, ok: false });
    await expect(endSession()).rejects.toThrow("Logout could not be confirmed");
    expect(readSessionCookies()).toEqual(first);
  });

  it("does not clear a newly signed-in account after an old logout completes", async () => {
    writeSessionCookies(credentials(true));
    const pending = deferred<{ ok: boolean; status: number }>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const ending = endSession();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const current = { ...credentials(true, "user-2"), refreshToken: token(604800, "new-account") };
    writeSessionCookies(current);
    pending.resolve({ ok: true, status: 200 });
    await ending;
    expect(readSessionCookies()).toEqual(current);
  });

  it("uses the absolute refresh expiry for secure cookies and broadcasts no credentials", () => {
    vi.stubGlobal("location", { protocol: "https:" });
    const session = credentials(true);
    writeSessionCookies(session);
    expect(Cookies.set).toHaveBeenCalledWith("token", session.token, expect.objectContaining({
      secure: true, sameSite: "strict", expires: expect.any(Date),
    }));
    expect(JSON.stringify(vi.mocked(localStorage.setItem).mock.calls)).not.toContain(session.refreshToken);
  });
});
