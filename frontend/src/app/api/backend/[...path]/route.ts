import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { browserSessionMarker } from "@/lib/browserSession";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const runtime = "nodejs";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const secure = process.env.NODE_ENV === "production";
const accessName = secure ? "__Host-backend-access" : "backend-access";
const refreshName = secure ? "__Host-backend-refresh" : "backend-refresh";
const allowed = new Set(["auth", "products", "orders", "users", "banners", "promo-codes", "analytics", "contact", "wishlist", "shared-carts", "ads", "campaigns", "translations", "reviews", "stats", "config"]);
const fail = (message: string, status: number) => NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

async function boundedBody(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new Error("BODY_LIMIT"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!allowed.has(path[0]) || path.some(p => !/^[\w.-]+$/.test(p) || p === "." || p === "..")) return fail("Not found", 404);
  const route = path.join("/");
  if (route === "auth/oauth-sync" || route === "orders/bkash/callback") return fail("Not found", 404);
  const mutation = !["GET", "HEAD"].includes(req.method);
  if (mutation && (req.headers.get("origin") !== req.nextUrl.origin || req.headers.get("x-requested-with") !== "ecommerce")) return fail("Invalid request origin", 403);
  if (req.headers.get("sec-fetch-site") === "cross-site") return fail("Invalid request origin", 403);
  let access = req.cookies.get(accessName)?.value;
  let refresh = req.cookies.get(refreshName)?.value;
  let upstreamRoute = route;
  try {
    if (route === "auth/oauth-handoff") {
      if (req.method !== "POST") return fail("Method not allowed", 405);
      const token = await getToken({ req, secret: process.env.AUTH_SECRET!, secureCookie: secure });
      if (!token?.backendRefreshToken || !token.backendToken) return fail("OAuth handoff unavailable", 401);
      access = token.backendToken;
      refresh = token.backendRefreshToken;
      upstreamRoute = "auth/refresh";
    }
    const headers = new Headers();
    // Vercel overwrites this header at ingress; other hosts need their own verified topology.
    const clientIp = process.env.VERCEL === "1" ? req.headers.get("x-vercel-forwarded-for") : null;
    if (clientIp && isIP(clientIp) && process.env.INTERNAL_API_SECRET) {
      const timestamp = String(Date.now());
      headers.set("X-Client-IP", clientIp);
      headers.set("X-Client-IP-Time", timestamp);
      headers.set("X-Client-IP-Signature", createHmac("sha256", process.env.INTERNAL_API_SECRET).update(`client-ip:${timestamp}:${clientIp}`).digest("hex"));
    }
    if (access) headers.set("Authorization", `Bearer ${access}`);
    for (const name of ["content-type", "idempotency-key"]) {
      const value = req.headers.get(name);
      if (value) headers.set(name, value);
    }
    let body: Buffer | string | undefined = mutation ? await boundedBody(req) : undefined;
    if (upstreamRoute === "auth/refresh") {
      if (!refresh) return fail("Session expired", 401);
      headers.set("content-type", "application/json");
      body = JSON.stringify({ refreshToken: refresh });
    }
    const upstream = await fetch(`${API}/${upstreamRoute}${req.nextUrl.search}`, {
      method: req.method, headers, body: Buffer.isBuffer(body) ? Uint8Array.from(body).buffer : body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30_000),
    });
    if (upstream.status === 204) return new NextResponse(null, { status: 204 });
    const data = await upstream.json();
    const credentials = upstream.ok && typeof data.token === "string" && typeof data.refreshToken === "string"
      ? { token: data.token, refreshToken: data.refreshToken } : null;
    if (credentials) {
      data.token = browserSessionMarker(credentials.token);
      data.refreshToken = browserSessionMarker(credentials.refreshToken);
    }
    const response = NextResponse.json(data, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    for (const name of ["retry-after", "ratelimit", "ratelimit-policy"]) {
      const value = upstream.headers.get(name);
      if (value) response.headers.set(name, value);
    }
    const cookieOptions = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
    if (credentials) {
      for (const [name, value] of [[accessName, credentials.token], [refreshName, credentials.refreshToken]]) {
        const { exp } = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString());
        response.cookies.set(name, value, { ...cookieOptions, expires: new Date(exp * 1000) });
      }
    }
    if ((upstream.ok && route === "auth/password") || ((upstream.ok || upstream.status === 401) && ["auth/logout", "auth/logout-all"].includes(route)) || upstream.status === 401 && ["auth/refresh", "auth/oauth-handoff"].includes(route)) {
      for (const name of [accessName, refreshName]) response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
    }
    return response;
  } catch (err) {
    return fail((err as Error).message === "BODY_LIMIT" ? "Request too large" : "Service unavailable", (err as Error).message === "BODY_LIMIT" ? 413 : 502);
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
