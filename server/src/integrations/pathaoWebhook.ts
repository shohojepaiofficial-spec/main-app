import { createHmac, createHash, timingSafeEqual } from "node:crypto";

// Pathao merchant webhook: Pathao POSTs each courier status change to
// /api/orders/pathao/webhook. Pathao's webhook docs aren't public; what is
// known (merchant panel + a published client library):
// - it signs requests in the `X-Pathao-Signature` header with the webhook
//   secret set in the merchant panel (PATHAO_WEBHOOK_SECRET);
// - to accept the webhook URL, the reply must carry the panel's integration
//   UUID in `X-Pathao-Merchant-Webhook-Integration-Secret`
//   (PATHAO_WEBHOOK_INTEGRATION_SECRET);
// - the body has `event`, `consignment_id`, `order_status` (and usually
//   `merchant_order_id`, our order id).
// Since the signing scheme isn't documented, a signature is accepted if it
// is the secret itself or an HMAC-SHA256 (hex) of the raw body with it.
// The first real deliveries are logged so the format can be confirmed.

export const INTEGRATION_HEADER = "X-Pathao-Merchant-Webhook-Integration-Secret";

export function isPathaoWebhookConfigured(): boolean {
  return !!process.env.PATHAO_WEBHOOK_SECRET;
}

const sameText = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export function verifyPathaoSignature(signature: string | undefined, rawBody: Buffer | undefined): boolean {
  const secret = process.env.PATHAO_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const sent = signature.trim().replace(/^sha256=/i, "");
  if (sameText(sent, secret)) return true;
  if (!rawBody) return false;
  const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");
  return sameText(sent.toLowerCase(), hmac);
}

export interface PathaoWebhookUpdate {
  consignmentId?: string;
  merchantOrderId?: string;
  status: string;
}

// Pulls the useful parts out of a webhook body; null when it has nothing
// to record (e.g. Pathao's own "is this URL alive?" test call).
export function readPathaoWebhook(body: unknown): PathaoWebhookUpdate | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, 120) : undefined);
  const status = text(b.order_status) ?? text(b.event)?.replace(/^order\./i, "").replace(/[-_]/g, " ");
  const consignmentId = text(b.consignment_id);
  const merchantOrderId = text(b.merchant_order_id);
  if (!status || (!consignmentId && !merchantOrderId)) return null;
  return { consignmentId, merchantOrderId, status };
}

// Which store status a Pathao status means. Only used when
// PATHAO_WEBHOOK_AUTO_STATUS=true (off until real webhooks confirm the
// status names). Partial deliveries, returns and failures are left for
// staff to handle.
export function storeStatusFor(pathaoStatus: string): "shipped" | "delivered" | null {
  const s = pathaoStatus.toLowerCase();
  if (/partial|return|fail|cancel|hold|exchange/.test(s)) return null;
  if (/picked|transit|sorting|hub|out for delivery/.test(s)) return "shipped";
  if (/deliver/.test(s)) return "delivered";
  return null;
}
