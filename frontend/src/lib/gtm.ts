// Google Tag Manager — a single container script that lets ad-platform tags
// (Meta Pixel, GA4, TikTok, etc.) be added, changed, or removed from GTM's
// own web UI later without a code deploy. This file's job is just to load
// the container (gated by NEXT_PUBLIC_GTM_ID, same "zero-config-required,
// works once a real id exists" pattern as every other integration in this
// app — SMS, Cloudinary, Sentry, the social-ads connectors) and push
// structured commerce events to `dataLayer` at the real lifecycle points
// (see usePageViewTracking, useCartStore#addItem, ProductClickTracker,
// CheckoutView) — using GA4's Enhanced Ecommerce event names/shape, since
// that's what most GTM tag templates (including Meta Pixel's) already
// expect out of the box. Which actual ad platforms are wired up is then a
// GTM-side configuration question, not something this app's code needs to
// know about.
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export function isGtmConfigured(): boolean {
  return !!GTM_ID;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

// No-op with GTM unconfigured or on the server — every call site can call
// this unconditionally, same fire-and-forget convention as lib/analytics.ts.
export function pushToDataLayer(data: Record<string, unknown>) {
  if (!isGtmConfigured() || typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // GTM deep-merges each push into one data model, so without this a field
  // only the previous event had (e.g. view_item's item_category) would
  // carry over into the next ecommerce event. Clearing first is Google's
  // documented pattern for GA4 ecommerce pushes.
  if ("ecommerce" in data) window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push(data);
}
