import { api } from "@/lib/api";

const SESSION_KEY = "analytics-session-id";

// A per-browser random id, not tied to login — lets the admin overview count
// roughly how many distinct visitors there are, including guests who never
// sign in. Not identity, just a rough visitor count (see AnalyticsEvent).
function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// Fire-and-forget on purpose — tracking must never block or break the page
// it's called from, so every call site just calls this and moves on.
function track(body: { type: "page_view" | "product_click"; path: string; productId?: string }) {
  const sessionId = getSessionId();
  if (!sessionId) return;
  // `document.referrer` reflects the browser tab's real navigation-level
  // referrer, not the last client-side route — it stays whatever it was on
  // the very first load of this tab (e.g. a link opened from Facebook/
  // WhatsApp/etc.), so the server just needs the first page_view per
  // session to know where that visitor came from. See utils/referrer.ts.
  const referrer = typeof document !== "undefined" ? document.referrer || undefined : undefined;
  api.post("/analytics/track", { ...body, sessionId, referrer }).catch(() => {});
}

export function trackPageView(path: string) {
  track({ type: "page_view", path });
}

export function trackProductClick(productId: string, path: string) {
  track({ type: "product_click", path, productId });
}
