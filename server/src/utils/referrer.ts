// Turns a raw `document.referrer` into a friendly platform label for the
// analytics dashboard's "Visitors by source" breakdown. Best-effort — a
// referrer is only as reliable as the browser sending it (many social apps'
// in-app browsers blank or rewrite it), but it's the standard, low-friction
// way to see roughly where traffic is coming from without adding UTM tagging
// to every shared link.
const SOCIAL_DOMAINS: { test: (host: string) => boolean; label: string }[] = [
  { test: (h) => h.includes("facebook.com") || h.includes("fb.com"), label: "Facebook" },
  { test: (h) => h.includes("m.me") || h.includes("messenger.com"), label: "Messenger" },
  { test: (h) => h.includes("instagram.com"), label: "Instagram" },
  { test: (h) => h.includes("whatsapp.com") || h.includes("wa.me"), label: "WhatsApp" },
  { test: (h) => h.includes("t.me") || h.includes("telegram.org"), label: "Telegram" },
  { test: (h) => h.includes("twitter.com") || h.includes("x.com") || h.includes("t.co"), label: "X (Twitter)" },
  { test: (h) => h.includes("linkedin.com"), label: "LinkedIn" },
  { test: (h) => h.includes("youtube.com") || h.includes("youtu.be"), label: "YouTube" },
  { test: (h) => h.includes("tiktok.com"), label: "TikTok" },
  { test: (h) => h.includes("pinterest.com"), label: "Pinterest" },
];

export const DIRECT_LABEL = "Direct / App";
export const OTHER_SITES_LABEL = "Other websites";

export function classifyReferrer(referrer?: string | null): string {
  if (!referrer) return DIRECT_LABEL;

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return OTHER_SITES_LABEL;
  }

  const match = SOCIAL_DOMAINS.find((d) => d.test(host));
  return match ? match.label : OTHER_SITES_LABEL;
}
