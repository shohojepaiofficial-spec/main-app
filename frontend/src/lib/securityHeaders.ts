// Response headers sent with every page and route (wired up in next.config.ts).
//
// The CSP deliberately has no script-src: a useful one needs a per-request
// nonce, which would force every page to render dynamically (losing the
// prerendered storefront), and GTM injects tags from hosts we don't control.
// form-action is left out too: Google sign-in redirects off-site after a form
// POST, which browsers count against it. What's here stops the site being
// framed (clickjacking), <base> hijacking and plugin content.
const contentSecurityPolicy = ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'"].join("; ");

export const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // For browsers that predate frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
