// A generic HTTP-based SMS sender. Unlike Meta's Graph API or X's API (one
// fixed, well-documented shape), Bangladeshi bulk-SMS gateways (BulkSMSBD,
// MimSMS, SSL Wireless, Alpha SMS, etc.) each have their own request shape —
// there's no single standard to build against sight-unseen. This targets the
// single most common pattern among them (an HTTP GET with api_key/senderid/
// number/message query params), configured entirely through env vars so no
// code change is needed for a gateway that happens to match it.
//
// If your chosen gateway's docs use different field names, a different HTTP
// method, or a JSON body, this file (specifically the URL/params below) is
// the one place to adjust — everything else in the app (opt-in flags,
// campaigns, etc.) is gateway-agnostic and won't need to change.
export function isSmsConfigured(): boolean {
  return !!(process.env.SMS_API_URL && process.env.SMS_API_KEY);
}

export async function sendSms(to: string, message: string): Promise<void> {
  const apiUrl = process.env.SMS_API_URL as string;
  const apiKey = process.env.SMS_API_KEY as string;
  const senderId = process.env.SMS_SENDER_ID;
  const method = process.env.SMS_METHOD === "POST" ? "POST" : "GET";

  const params = new URLSearchParams({ api_key: apiKey, number: to, message });
  if (senderId) params.set("senderid", senderId);

  const url = method === "GET" ? `${apiUrl}?${params.toString()}` : apiUrl;
  const res = await fetch(url, {
    method,
    ...(method === "POST"
      ? { headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() }
      : {}),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SMS gateway error (${res.status}): ${body.slice(0, 200)}`);
  }
}
