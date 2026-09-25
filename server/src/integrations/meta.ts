// Facebook Page posts and Instagram posts both go through Meta's Graph API
// using the same Page access token, so they share this one file. Needed
// env vars (see server/.env.example):
//   FACEBOOK_PAGE_ID              — the numeric id of the Facebook Page to post to
//   FACEBOOK_PAGE_ACCESS_TOKEN    — a Page access token with pages_manage_posts
//                                   (+ instagram_content_publish for IG) scope
//   INSTAGRAM_BUSINESS_ACCOUNT_ID — the Instagram Business account connected
//                                   to that same Page
//
// A single self-owned Page/app can use these without Meta's App Review — add
// your own Facebook/Instagram accounts as "testers" on the app in
// developers.facebook.com and generate a long-lived Page token from there.
const GRAPH_VERSION = "v26.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function isFacebookConfigured(): boolean {
  return !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
}

export function isInstagramConfigured(): boolean {
  return !!(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
}

async function graphPost(path: string, params: Record<string, string>): Promise<{ id: string }> {
  const url = `${GRAPH_BASE}/${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { method: "POST" });
  const data = (await res.json()) as { id: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data?.error?.message || `Meta Graph API error (${res.status})`);
  }
  return data;
}

// Posts a photo with the caption if an image is given, otherwise a plain
// text (+ optional link) post to the Page's feed.
export async function postToFacebook(caption: string, imageUrl?: string, link?: string): Promise<string> {
  const pageId = process.env.FACEBOOK_PAGE_ID as string;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN as string;

  if (imageUrl) {
    const data = await graphPost(`${pageId}/photos`, { url: imageUrl, caption, access_token: accessToken });
    return data.id;
  }

  const data = await graphPost(`${pageId}/feed`, {
    message: caption,
    ...(link ? { link } : {}),
    access_token: accessToken,
  });
  return data.id;
}

// Instagram Graph API publishing is always two-step (create a media
// container, then publish it) and always needs an image — there's no
// text-only Instagram post. `imageUrl` must be a publicly reachable https
// URL (Meta's servers fetch it directly) — see SERVER_PUBLIC_URL in
// server/.env.example; a localhost URL won't work here.
export async function postToInstagram(caption: string, imageUrl: string): Promise<string> {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID as string;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN as string;

  const container = await graphPost(`${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });
  const published = await graphPost(`${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: accessToken,
  });
  return published.id;
}
