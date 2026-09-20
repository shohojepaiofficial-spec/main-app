// bKash Tokenized Checkout (URL-based) — see docs/ARCHITECTURE.md's "Checkout
// & Orders" section. Needed env vars (see server/.env.example):
//   BKASH_BASE_URL, BKASH_USERNAME, BKASH_PASSWORD, BKASH_APP_KEY, BKASH_APP_SECRET
//
// Endpoint shapes below were verified directly against bKash's live sandbox
// (not just its docs, which are inconsistent between the "Request URL"
// headings and the actual sample requests) — in particular, Execute and
// Query both take `paymentID` in a JSON body to a fixed path, NOT as a URL
// path segment the way the "Request URL" headings describe; hitting the
// path-segment form returns a misleading AWS API Gateway 403
// (IncompleteSignatureException) rather than a real bKash error.
const GRANT_PATH = "/tokenized/checkout/token/grant";
const CREATE_PATH = "/tokenized/checkout/create";
const EXECUTE_PATH = "/tokenized/checkout/execute";
const QUERY_PATH = "/tokenized/checkout/payment/status";

interface BkashConfig {
  baseUrl: string;
  username: string;
  password: string;
  appKey: string;
  appSecret: string;
}

function readConfig(): BkashConfig | null {
  const baseUrl = process.env.BKASH_BASE_URL;
  const username = process.env.BKASH_USERNAME;
  const password = process.env.BKASH_PASSWORD;
  const appKey = process.env.BKASH_APP_KEY;
  const appSecret = process.env.BKASH_APP_SECRET;
  if (!baseUrl || !username || !password || !appKey || !appSecret) return null;
  return { baseUrl, username, password, appKey, appSecret };
}

export function isBkashConfigured(): boolean {
  return readConfig() !== null;
}

// A fresh Grant Token per process, cached until close to its (usually
// 1-hour) expiry. Deliberately never calls bKash's Refresh Token API — it's
// rate-limited to twice an hour, while re-granting isn't, so re-granting on
// expiry is simpler and just as cheap at this store's traffic.
let cachedToken: { idToken: string; expiresAt: number } | null = null;

async function getIdToken(config: BkashConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.idToken;
  }

  const res = await fetch(`${config.baseUrl}${GRANT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: config.username,
      password: config.password,
    },
    body: JSON.stringify({ app_key: config.appKey, app_secret: config.appSecret }),
  });
  const data = (await res.json()) as {
    id_token?: string;
    expires_in?: number;
    statusMessage?: string;
  };
  if (!res.ok || !data.id_token) {
    cachedToken = null;
    throw new Error(data.statusMessage || `bKash grant token failed (${res.status})`);
  }

  cachedToken = { idToken: data.id_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.idToken;
}

async function authedPost<T>(config: BkashConfig, path: string, body: Record<string, unknown>): Promise<T> {
  const idToken = await getIdToken(config);
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: idToken,
      "X-App-Key": config.appKey,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export interface CreateBkashPaymentInput {
  amount: number;
  merchantInvoiceNumber: string;
  payerReference: string;
  callbackURL: string;
}

export async function createBkashPayment(
  input: CreateBkashPaymentInput
): Promise<{ paymentID: string; bkashURL: string }> {
  const config = readConfig();
  if (!config) throw new Error("bKash isn't configured");

  const data = await authedPost<{
    paymentID?: string;
    bkashURL?: string;
    statusMessage?: string;
    message?: string;
  }>(config, CREATE_PATH, {
    mode: "0011",
    payerReference: input.payerReference.replace(/[<>&]/g, "").slice(0, 255),
    callbackURL: input.callbackURL,
    amount: input.amount.toFixed(2),
    currency: "BDT",
    // "sale" is a direct one-step charge — Execute Payment alone lands on
    // transactionStatus "Completed". "authorization" (what bKash's Create
    // Payment field docs describe, easy to reach for by mistake) is a
    // two-phase hold-then-capture flow instead — Execute only gets you to
    // "Authorized", and the money never actually moves without a separate,
    // not-implemented-here Capture Payment call. Confirmed live against the
    // sandbox: "authorization" landed a real completed wallet payment at
    // "Authorized" forever; there's no reason for a plain checkout charge to
    // ever hold rather than capture immediately.
    intent: "sale",
    merchantInvoiceNumber: input.merchantInvoiceNumber.slice(0, 255),
  });

  if (!data.paymentID || !data.bkashURL) {
    throw new Error(data.statusMessage || data.message || "bKash create payment failed");
  }
  return { paymentID: data.paymentID, bkashURL: data.bkashURL };
}

export interface BkashPaymentResult {
  transactionStatus?: string;
  trxID?: string;
  amount?: string;
  statusCode?: string;
  statusMessage?: string;
}

export async function executeBkashPayment(paymentID: string): Promise<BkashPaymentResult> {
  const config = readConfig();
  if (!config) throw new Error("bKash isn't configured");
  return authedPost<BkashPaymentResult>(config, EXECUTE_PATH, { paymentID });
}

// Used as a fallback when Execute doesn't come back with "Completed" — e.g.
// a repeat hit of the callback route lands on paymentID's one-time-only
// Execute limit ("Payment execution already been called before") rather
// than a real result, so this asks bKash directly what actually happened.
export async function queryBkashPayment(paymentID: string): Promise<BkashPaymentResult> {
  const config = readConfig();
  if (!config) throw new Error("bKash isn't configured");
  return authedPost<BkashPaymentResult>(config, QUERY_PATH, { paymentID });
}
