import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }));
import { getToken } from "next-auth/jwt";
import { POST, GET } from "./route";
const fetchMock = vi.fn();
const jwt = (kind: string) => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, kind })).toString("base64url")}.secret-signature`;
const token = jwt("access"), refreshToken = jwt("refresh");
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
function request(path: string, extra: Record<string, string> = {}, method = "POST") {
  return new NextRequest(`http://localhost:3000/api/backend/${path}`, { method, headers: { origin: "http://localhost:3000", "x-requested-with": "ecommerce", "content-type": "application/json", ...extra }, ...(method === "POST" ? { body: "{}" } : {}) });
}
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());
describe("server-managed browser credentials", () => {
  it("sets HttpOnly session cookies and removes credential signatures from JSON", async () => {
    fetchMock.mockResolvedValue(Response.json({ token, refreshToken, user: { id: "user" } }));
    const response = await POST(request("auth/login"), context("auth/login"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("secret-signature");
    expect(response.cookies.get("backend-access")?.value).toBe(token);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });
  it.each<Record<string, string>>([{ origin: "https://attacker.invalid" }, { "x-requested-with": "" }, { "sec-fetch-site": "cross-site" }])("rejects cross-site mutations before reaching the API", async headers => {
    const response = await POST(request("auth/login", headers), context("auth/login"));
    expect(response.status).toBe(403); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("takes refresh credentials from HttpOnly cookies instead of the request body", async () => {
    fetchMock.mockResolvedValue(Response.json({ token, refreshToken, user: { id: "user" } }));
    await POST(request("auth/refresh", { cookie: `backend-refresh=${refreshToken}` }), context("auth/refresh"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refreshToken });
  });
  it("ignores a browser-supplied Authorization header", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "user" }));
    await GET(request("auth/me", { cookie: `backend-access=${token}`, authorization: "Bearer forged" }, "GET"), context("auth/me"));
    expect(fetchMock.mock.calls[0][1].headers.get("authorization")).toBe(`Bearer ${token}`);
  });
  it("blocks the internal OAuth exchange", async () => {
    expect((await POST(request("auth/oauth-sync"), context("auth/oauth-sync"))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("redeems OAuth server-side without returning backend credentials", async () => {
    vi.mocked(getToken).mockResolvedValue({ backendToken: token, backendRefreshToken: refreshToken });
    fetchMock.mockResolvedValue(Response.json({ token, refreshToken, user: { id: "user" } }));
    const response = await POST(request("auth/oauth-handoff"), context("auth/oauth-handoff"));
    expect(fetchMock.mock.calls[0][0]).toContain("/auth/refresh");
    expect(JSON.stringify(await response.json())).not.toContain("secret-signature");
  });
  it("expires HttpOnly cookies only after confirmed logout", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "Logged out" }));
    const response = await POST(request("auth/logout"), context("auth/logout"));
    expect(response.cookies.get("backend-access")?.value).toBe("");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
