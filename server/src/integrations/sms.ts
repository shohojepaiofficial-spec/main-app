// REVE SMS (revesms.com) HTTP API — "Send SMS Using Simple Parameters":
//   GET <SMS_API_URL>?apikey=&secretkey=&callerID=&toUser=&messageContent=
//   → {"Status":"0","Text":"ACCEPTD","Message_ID":"444"}
// The gateway answers HTTP 200 even for a rejected send, so success is read
// from the JSON `Status` ("0" = accepted), not the HTTP status alone.
//
// Same "zero-config, falls back until keys are added" pattern as the other
// integrations: with the env vars unset, isSmsConfigured() is false and every
// caller skips sending.
const TIMEOUT_MS = 10_000;

export function isSmsConfigured(): boolean {
  return !!(process.env.SMS_API_URL && process.env.SMS_API_KEY && process.env.SMS_SECRET_KEY && process.env.SMS_SENDER_ID);
}

// Bangladeshi mobile numbers in whatever form a customer typed them
// ("01712-345678", "+8801712345678", "1712345678") → "8801712345678".
// Returns null for anything that isn't a valid BD mobile number.
export function toBdMsisdn(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^1[3-9]\d{8}$/.test(local) ? `880${local}` : null;
}

export async function sendSms(to: string, message: string): Promise<void> {
  const msisdn = toBdMsisdn(to);
  if (!msisdn) throw new Error("Not a valid Bangladeshi mobile number");

  const params = new URLSearchParams({
    apikey: process.env.SMS_API_KEY as string,
    secretkey: process.env.SMS_SECRET_KEY as string,
    callerID: process.env.SMS_SENDER_ID as string,
    toUser: msisdn,
    messageContent: message,
  });
  // Never put this URL in an error/log: it carries the secret key.
  const res = await fetch(`${process.env.SMS_API_URL}?${params.toString()}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`SMS gateway error (${res.status}): ${body.slice(0, 200)}`);

  let result: { Status?: string | number; Text?: string };
  try {
    result = JSON.parse(body);
  } catch {
    throw new Error(`SMS gateway returned an unreadable response: ${body.slice(0, 200)}`);
  }
  if (String(result.Status) !== "0") {
    throw new Error(`SMS gateway rejected the message (Status ${result.Status}): ${result.Text ?? "no reason given"}`);
  }
}

// REVE's balance check is a separate host/page from sendtext and is keyed by
// the account's client ID, not the API key:
//   GET https://smpp.revesms.com/sms/smsConfiguration/smsClientBalance.jsp?client=CLIENT_ID
// Its reply format isn't documented; an unknown client answers with the plain
// text "Invalid Account". So this accepts JSON with a balance-like field or
// plain text, and takes the first number it finds.
const DEFAULT_BALANCE_URL = "https://smpp.revesms.com/sms/smsConfiguration/smsClientBalance.jsp";

export function isSmsBalanceConfigured(): boolean {
  return !!process.env.SMS_CLIENT_ID;
}

export function parseSmsBalance(body: string): number | null {
  let text = body.trim();
  try {
    const json = JSON.parse(text);
    if (typeof json === "number") return json;
    if (json && typeof json === "object") {
      const key = Object.keys(json).find((k) => /balance|credit|amount/i.test(k));
      if (key) text = String(json[key]);
    }
  } catch {
    // Plain text / HTML reply — fall through to number extraction.
  }
  const match = text.replace(/<[^>]*>/g, " ").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export async function getSmsBalance(): Promise<number> {
  const url = `${process.env.SMS_BALANCE_URL || DEFAULT_BALANCE_URL}?${new URLSearchParams({ client: process.env.SMS_CLIENT_ID as string })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`SMS balance check failed (${res.status})`);
  const balance = parseSmsBalance(body);
  if (balance === null) throw new Error(`SMS gateway did not return a balance: ${body.trim().slice(0, 100)}`);
  return balance;
}
