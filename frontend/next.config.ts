import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
