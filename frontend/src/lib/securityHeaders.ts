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
  // A page we open (or one that opened us) can't reach back into this tab.
  // Safe: Google sign-in and bKash are full-page redirects, not popups, and
  // WhatsApp/Messenger links already open with noopener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Vercel's default HSTS covers only this host; this also pins every
  // subdomain (api. already serves HTTPS only; webmail is on privateemail.com).
  // No "preload": that list is hard to leave, so it's a separate decision.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];
