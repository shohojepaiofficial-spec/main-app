import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { securityHeaders } from "./securityHeaders";

const value = (key: string) => securityHeaders.find(h => h.key === key)?.value;

describe("security headers", () => {
  it("forbids framing the site", () => {
    expect(value("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(value("X-Frame-Options")).toBe("DENY");
  });
  it("locks down <base>, plugins and MIME sniffing", () => {
    expect(value("Content-Security-Policy")).toContain("base-uri 'self'");
    expect(value("Content-Security-Policy")).toContain("object-src 'none'");
    expect(value("X-Content-Type-Options")).toBe("nosniff");
  });
  it("isolates the tab from pages it opens and pins HTTPS on every subdomain", () => {
    expect(value("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(value("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
  });
  it("is applied to every path", async () => {
    expect(await nextConfig.headers?.()).toEqual([{ source: "/:path*", headers: securityHeaders }]);
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
