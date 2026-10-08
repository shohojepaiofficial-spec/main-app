vi.mock("../models/AuthSession", () => ({ AuthSession: { create: vi.fn().mockResolvedValue({}), exists: vi.fn().mockResolvedValue({ _id: "session" }) } }));
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { signTwoFactorChallenge } from "../utils/twoFactor";
import { signTestAccessToken as signAccessToken } from "../testUtils/auth";
import { User } from "../models/User";
import auth from "./authRoutes";
import products from "./productRoutes";
import orders from "./orderRoutes";
import users from "./userRoutes";
import banners from "./bannerRoutes";
import promos from "./promoCodeRoutes";
import analytics from "./analyticsRoutes";
import contact from "./contactRoutes";
import wishlist from "./wishlistRoutes";
import shared from "./sharedCartRoutes";
import ads from "./adRoutes";
import campaigns from "./campaignRoutes";
import translations from "./translationRoutes";
import reviews from "./reviewRoutes";
import stats from "./statsRoutes";

// Explicit exceptions: catalog reads, public submissions, signed email/payment
// links, login entry points, and the shared-secret OAuth exchange. Every other
// route must reject both anonymous requests and incomplete 2FA logins.
const publicRoutes = new Set([
  "auth POST /refresh", "auth POST /register", "auth POST /login", "auth POST /oauth-sync",
  "auth POST /verify-email", "auth POST /forgot-password", "auth POST /reset-password",
  "auth GET /unsubscribe", "auth POST /2fa/verify-login",
  "products GET /", "products GET /categories", "products GET /:id", "products GET /:id/reviews",
  "orders GET /bkash/callback", "banners GET /", "promos POST /validate", "promos GET /active",
  "analytics POST /track", "contact POST /", "shared GET /:id", "translations GET /", "stats GET /",
]);
const routers = { auth, products, orders, users, banners, promos, analytics, contact, wishlist, shared, ads, campaigns, translations, reviews, stats };
const protectedRoutes: { name: string; method: string; path: string }[] = [];
const customerRoutes = new Set([
  "auth POST /logout", "auth POST /logout-all", "auth GET /me", "auth PATCH /profile", "auth PATCH /password", "auth PATCH /delivery-location",
  "auth PATCH /marketing-opt-in", "auth POST /resend-verification", "auth POST /2fa/setup",
  "auth POST /2fa/confirm", "auth POST /2fa/disable", "orders POST /", "orders POST /delivery-quote",
  "auth POST /2fa/replace", "auth POST /2fa/replace/confirm",
  "orders GET /my", "orders GET /reviewable", "orders PATCH /:id/cancel", "orders GET /:id",
  "products POST /:id/reviews", "wishlist GET /", "wishlist POST /:productId",
  "wishlist DELETE /:productId", "shared POST /",
]);
const app = express();
app.use(express.json());
for (const [prefix, router] of Object.entries(routers)) {
  app.use(`/${prefix}`, router);
  for (const layer of router.stack) {
    const route = layer.route as (typeof layer.route & { methods: Record<string, boolean> });
    if (!route) continue;
    for (const method of Object.keys(route.methods)) {
      const name = `${prefix} ${method.toUpperCase()} ${route.path}`;
      if (!publicRoutes.has(name)) protectedRoutes.push({ name, method: method.toUpperCase(), path: `/${prefix}${route.path}`.replace(/:[^/]+/g, "507f1f77bcf86cd799439011") });
    }
  }
}
let server: Server;
let baseUrl: string;
beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", "route-coverage-secret");
  // Stale staff permissions must not authorize a demoted customer.
  vi.spyOn(User, "findById").mockReturnValue({ select: () => Promise.resolve({
    role: "user", permissions: ["products:manage", "orders:manage", "analytics:manage", "reviews:manage", "ads:manage", "marketing:manage", "banners:manage", "translations:manage", "promotions:manage", "messages:manage"],
  }) } as never);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("private route authentication", () => {
  it.each(protectedRoutes)("$name rejects missing and challenge tokens", async ({ method, path }) => {
    for (const token of [null, signTwoFactorChallenge("507f1f77bcf86cd799439011")]) {
      const response = await fetch(baseUrl + path, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      expect(response.status).toBe(401);
    }
  });
  it.each(protectedRoutes.filter(({ name }) => !customerRoutes.has(name)))("$name rejects customers with stale permissions", async ({ method, path }) => {
    const response = await fetch(baseUrl + path, {
      method,
      headers: { Authorization: `Bearer ${signAccessToken("507f1f77bcf86cd799439011", "admin")}` },
    });
    expect(response.status).toBe(403);
  });
  it("rejects browser calls to the internal Google exchange", async () => {
    const response = await fetch(baseUrl + "/auth/oauth-sync", { method: "POST" });
    expect(response.status).toBe(403);
  });
  it("rate-limits factor management across setup, confirmation and disabling", async () => {
    vi.mocked(User.findById).mockReturnValue({ select: () => Promise.resolve({ role: "user" }) } as never);
    const headers = { Authorization: `Bearer ${signAccessToken("507f1f77bcf86cd799439012", "user")}` };
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await fetch(baseUrl + "/auth/2fa/setup", { method: "POST", headers });
      expect(response.status).toBe(403);
    }
    for (const action of ["setup", "confirm", "disable", "replace", "replace/confirm"]) {
      const response = await fetch(baseUrl + `/auth/2fa/${action}`, { method: "POST", headers });
      expect(response.status).toBe(429);
    }
  });
});
