import webpush from "web-push";

// Browser push (Web Push + VAPID). Same "works with zero config, turns on
// once keys exist" pattern as SMS/Pathao: with VAPID_PUBLIC_KEY /
// VAPID_PRIVATE_KEY / VAPID_SUBJECT unset, isWebPushConfigured() is false and
// nothing is sent — the in-site bell still works. Generate keys once with
// `npx web-push generate-vapid-keys`.
interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

function readConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
  return readConfig() !== null;
}

export function getVapidPublicKey(): string | null {
  return readConfig()?.publicKey ?? null;
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
}

// "gone": the browser dropped this subscription (404/410) — delete it.
export type PushResult = "sent" | "gone" | "failed" | "not_configured";

export async function sendWebPush(target: PushTarget, payload: PushPayload): Promise<PushResult> {
  const config = readConfig();
  if (!config) return "not_configured";
  try {
    await webpush.sendNotification(target, JSON.stringify(payload), {
      vapidDetails: config,
      TTL: 24 * 60 * 60,
      timeout: 8000,
    });
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("Web push failed:", (err as Error).message);
    return "failed";
  }
}
