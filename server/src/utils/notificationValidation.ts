import { z } from "zod";

// Request bodies for the browser push endpoints, checked by
// middleware/controllerInput.ts before the handler reads anything.

// The server POSTs to whatever endpoint is stored, so only the browsers'
// own push services are accepted — otherwise a subscription could point the
// server at an internal or arbitrary address.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^[a-z0-9.-]+\.notify\.windows\.com$/, /^web\.push\.apple\.com$/, /^[a-z0-9.-]+\.push\.apple\.com$/];

export function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

export const pushSubscriptionSchema = z
  .object({
    endpoint: z.string().max(2000).refine(isAllowedPushEndpoint, "Unsupported push service"),
    keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }).strict(),
  })
  .strict();

export const pushUnsubscribeSchema = z.object({ endpoint: z.string().min(1).max(2000) }).strict();

export const notificationInputs: Record<string, z.ZodTypeAny> = {
  subscribePush: pushSubscriptionSchema,
  unsubscribePush: pushUnsubscribeSchema,
};
