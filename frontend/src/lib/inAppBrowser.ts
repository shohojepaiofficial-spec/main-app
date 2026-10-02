// Google refuses OAuth sign-in from embedded browsers ("Error 403:
// disallowed_useragent"), and that's exactly where most social traffic lands:
// a link tapped inside Facebook, Messenger or Instagram opens in the app's own
// browser, not Chrome/Safari. Detecting it lets the login modal steer people to
// email sign-in or a real browser instead of a dead-end Google error page.

export type InAppBrowser = "facebook" | "messenger" | "instagram" | "other";

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  const ua = userAgent;
  // Order matters: Messenger's UA also carries the generic FBAN/FB_IAB tokens.
  if (/MessengerForiOS|FB_IAB\/Orca-Android|\bOrca-Android\b/i.test(ua)) return "messenger";
  if (/\bInstagram\b/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return "facebook";
  // Any other Android WebView (TikTok, LinkedIn, IMO, ...). Real Chrome on
  // Android never includes the "; wv)" marker.
  if (/Android.*;\s*wv\)/i.test(ua)) return "other";
  return null;
}

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

// An Android intent URL that hands the page to Chrome. In-app browsers on
// Android follow these; iOS has no equivalent, so iOS users get instructions
// and a copy-link button instead. The hash is dropped: a second "#" ahead of
// "#Intent;" can confuse Android's intent parser, and no page here needs it.
export function toChromeIntentUrl(pageUrl: string): string {
  const url = new URL(pageUrl);
  const scheme = url.protocol.replace(":", "");
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}
