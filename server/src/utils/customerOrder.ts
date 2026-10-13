// What a customer may see of their own order (SEC-16). An allowlist, not a
// blocklist: a field added to Order.ts later stays staff-only until it is
// listed here. Left out on purpose: internalNote, the courier* fields, the
// paymentReview* fields, the bKash ids, idempotencyKey/requestFingerprint,
// source and sharedCartId.
const CUSTOMER_ORDER_FIELDS = [
  "_id",
  "user",
  "items",
  "itemsTotal",
  "deliveryFee",
  "promoCode",
  "discount",
  "preorderDiscount",
  "isPreorder",
  "expectedShipDate",
  "totalAmount",
  "status",
  "paymentMethod",
  "shippingAddress",
  "deliveredAt",
  "statusHistory",
  "createdAt",
  "updatedAt",
] as const;

type OrderLike = { toObject?: () => unknown } | Record<string, unknown>;

export function customerOrderView(order: OrderLike): Record<string, unknown> {
  const withToObject = order as { toObject?: () => unknown };
  const source = (typeof withToObject.toObject === "function" ? withToObject.toObject() : order) as Record<string, unknown>;
  const view: Record<string, unknown> = {};
  for (const field of CUSTOMER_ORDER_FIELDS) {
    if (source[field] !== undefined) view[field] = source[field];
  }
  return view;
}
