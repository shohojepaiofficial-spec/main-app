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
// a "client ID":
//   GET https://smpp.revesms.com/sms/smsConfiguration/smsClientBalance.jsp?client=CLIENT_ID
// REVE support said no separate client ID is needed, so unless SMS_CLIENT_ID
// is set this tries each SMS value already configured, in turn, and remembers
// (per process) whichever one the page accepts. The variable *name* that
// matched is returned so the dashboard can show it; values are never logged.
// The reply format isn't documented; an unknown client answers with the
// plain text "Invalid Account", so parseSmsBalance accepts JSON with a
// balance-like field or plain text, and takes the first number it finds.
const DEFAULT_BALANCE_URL = "https://smpp.revesms.com/sms/smsConfiguration/smsClientBalance.jsp";
const BALANCE_CANDIDATES = ["SMS_CLIENT_ID", "SMS_API_KEY", "SMS_SENDER_ID", "SMS_SECRET_KEY"] as const;
type BalanceSource = (typeof BALANCE_CANDIDATES)[number];
let matchedSource: BalanceSource | null = null;

export function isSmsBalanceConfigured(): boolean {
  return BALANCE_CANDIDATES.some((name) => !!process.env[name]);
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

async function fetchBalance(client: string): Promise<number | null> {
  const url = `${process.env.SMS_BALANCE_URL || DEFAULT_BALANCE_URL}?${new URLSearchParams({ client })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`SMS balance check failed (${res.status})`);
  return parseSmsBalance(await res.text().catch(() => ""));
}

export async function getSmsBalance(): Promise<{ balance: number; source: BalanceSource }> {
  // An explicit SMS_CLIENT_ID wins; otherwise the last match is tried first.
  const order = process.env.SMS_CLIENT_ID
    ? (["SMS_CLIENT_ID"] as BalanceSource[])
    : [...new Set([matchedSource, ...BALANCE_CANDIDATES].filter((n): n is BalanceSource => !!n && n !== "SMS_CLIENT_ID"))];
  for (const name of order) {
    const value = process.env[name];
    if (!value) continue;
    const balance = await fetchBalance(value);
    if (balance !== null) {
      if (matchedSource !== name) console.log(`SMS balance: REVE accepted ${name} as the client ID`);
      matchedSource = name;
      return { balance, source: name };
    }
  }
  matchedSource = null;
  throw new Error(`SMS gateway did not accept any of ${order.join(", ")} as the balance client ID`);
}

export function resetSmsBalanceMatch() {
  matchedSource = null;
}
