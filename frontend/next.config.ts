import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Dev-only: the backend that serves /uploads is our own localhost:5000.
    // Next 16's image optimizer refuses to fetch any hostname that resolves
    // to a private/loopback IP by default (SSRF hardening) — safe to allow
    // here since it's just our own API, not an arbitrary internal network.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "5000", pathname: "/uploads/**" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
