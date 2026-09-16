import crypto from "crypto";

// Posting to X (Twitter) needs a paid API tier for write access as of the
// v2 API's current pricing — this is real, correct OAuth 1.0a signing code,
// but it can't be exercised end-to-end without a real paid developer
// account/app. Needed env vars (see server/.env.example):
//   X_API_KEY, X_API_SECRET       — the app's consumer key/secret
//   X_ACCESS_TOKEN, X_ACCESS_SECRET — an access token/secret for the account
//                                     posting (generate in the developer portal)
export function isXConfigured(): boolean {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_SECRET
  );
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// X's v2 tweet-creation endpoint takes a JSON body, so — per the OAuth 1.0a
// spec — only the OAuth params themselves (never the body) go into the
// signature base string; there's no query string here either.
function buildOAuth1Header(method: string, url: string): string {
  const consumerKey = process.env.X_API_KEY as string;
  const consumerSecret = process.env.X_API_SECRET as string;
  const token = process.env.X_ACCESS_TOKEN as string;
  const tokenSecret = process.env.X_ACCESS_SECRET as string;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
      .join(", ")
  );
}

// Text-only for now (with the destination link appended to the caption by
// the caller, same as a Facebook text post) — X's media-upload endpoint is
// a separate (v1.1, multipart) API and isn't wired up here.
export async function postToX(text: string): Promise<string> {
  const url = "https://api.twitter.com/2/tweets";
  const authorization = buildOAuth1Header("POST", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = (await res.json()) as { data?: { id: string }; detail?: string; title?: string };
  if (!res.ok || !data.data) {
    throw new Error(data?.detail || data?.title || `X API error (${res.status})`);
  }
  return data.data.id;
}
