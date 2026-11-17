import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Railway runs `next start` as a plain self-hosted server behind its own
  // edge proxy (Vercel's platform didn't need this). Without this flag,
  // Next.js computes req.nextUrl.origin from the container's own internal
  // bind address instead of the public Host header, so it never matches the
  // browser's real Origin header — the same-origin check in
  // app/api/backend/[...path]/route.ts then 403s every mutating request.
  experimental: { trustHostHeader: true },
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
  images: {
    // Dev only: the backend serving /uploads is our own localhost:5000, and
    // Next's image optimizer refuses private/loopback addresses unless told
    // otherwise. Production never allows it (SEC-24), so the optimizer can't
    // be pointed at anything on the server's own network.
    ...(isDev ? { dangerouslyAllowLocalIP: true } : {}),
    remotePatterns: [
      ...(isDev ? [{ protocol: "http" as const, hostname: "localhost", port: "5000", pathname: "/uploads/**" }] : []),
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Google profile pictures.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
