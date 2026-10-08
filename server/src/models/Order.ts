import { Schema, model, Document, Types } from "mongoose";

interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
  // Only for a product with variants (see Product.ts). The id is what stock
  // is restored to on cancellation; the label/selections are a snapshot
  // taken at purchase, so the order still reads "Black / L" even if the
  // admin later renames or deletes that variant.
  variant?: Types.ObjectId;
  variantLabel?: string;
  selections?: { name: string; value: string }[];
  sku?: string;
  // The product was on pre-order when this was bought — no stock was taken
  // for it; the product's preorder.reserved counter was moved instead, and
  // that's what a cancellation gives back (see orderController's
  // restoreStock).
  isPreorder?: boolean;
}

export interface IShippingDetails {
  fullName: string;
  phone: string;
  zila: string;
  upazila: string;
  addressLine: string;
}

// "bkash" only actually charges anyone once BKASH_* env vars are set (see
// integrations/bkash.ts) — otherwise createOrder 400s on it, same as before
// it was wired up.
export type PaymentMethod = "cod" | "bkash";

// "manual" = the admin recorded a phone/walk-in order on the customer's
// behalf (see adminCreateOrder) — those have no `user` unless the admin
// happened to be entering it for their own test purposes.
export type OrderSource = "online" | "manual";

export interface IOrder extends Document {
  // Absent for a manual order placed for a customer with no account — the
  // shippingAddress still has their name/phone, it just won't show up in
  // any account's "My Orders".
  user?: Types.ObjectId;
  items: IOrderItem[];
  // Product prices summed — excludes deliveryFee and discount, which are
  // tracked separately so the receipt can show them as distinct line items.
  itemsTotal: number;
  deliveryFee: number;
  // Whether `deliveryFee` came from a live Pathao quote or the flat
  // per-product fee (Pathao not configured, no confident address match, or
  // the live call failed) — see orderController.ts's resolveDeliveryFee.
  deliveryFeeSource: "pathao" | "flat";
  promoCode?: string;
  discount: number;
  // The pre-order discount for how this order is paid (see
  // Product.preorder) — separate from the promo-code `discount` so the
  // receipt can show both.
  preorderDiscount: number;
  // At least one line is a pre-order, so the whole parcel waits for it.
  isPreorder: boolean;
  // Latest ship date among the pre-order lines, when the admin set one.
  expectedShipDate?: Date;
  totalAmount: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  paymentMethod: PaymentMethod;
  // Only ever set for paymentMethod === "bkash" — see orderController.ts's
  // createOrder/bkashCallback. bkashPaymentID is bKash's own id for the
  // payment session (used to look the order up when bKash redirects the
  // customer's browser back); bkashTrxID is bKash's transaction id, only
  // present once the payment actually completed.
  bkashPaymentID?: string;
  bkashTrxID?: string;
  bkashRedirectUrl?: string;
  idempotencyKey?: string;
  requestFingerprint?: string;
  reservationExpiresAt?: Date;
  paymentReviewRequired?: boolean;
  lastPaymentCheckAt?: Date;
  source: OrderSource;
  shippingAddress: IShippingDetails;
  // Set when this order was placed by fulfilling someone else's shared-cart
  // "ask someone else to pay" link, rather than from the buyer's own cart.
  sharedCartId?: Types.ObjectId;
  // Admin-only, never shown to the customer — a free-text place to leave
  // context for other admins/coadmins (e.g. "customer asked for evening
  // delivery").
  internalNote?: string;
  // Courier/delivery tracking — provider-agnostic on purpose (only "pathao"
  // exists today, but nothing here assumes it's the only one ever will).
  // courierConsignmentId/courierTrackingStatus can be filled in by hand (the
  // admin booked outside the site, e.g. via Pathao's own dashboard) or by a
  // real API call once integrations/pathao.ts is configured — see
  // docs/ARCHITECTURE.md's "Courier & delivery" section.
  courierProvider?: "pathao";
  courierConsignmentId?: string;
  courierTrackingStatus?: string;
  courierNote?: string;
  courierBookedAt?: Date;
  createdAt: Date;
}

const shippingDetailsSchema = new Schema<IShippingDetails>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    zila: { type: String, required: true, trim: true },
    upazila: { type: String, required: true, trim: true },
    addressLine: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        variant: { type: Schema.Types.ObjectId },
        variantLabel: { type: String },
        selections: {
          type: [new Schema({ name: String, value: String }, { _id: false })],
          default: undefined,
        },
        sku: { type: String },
        isPreorder: { type: Boolean },
      },
    ],
    itemsTotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    deliveryFeeSource: { type: String, enum: ["pathao", "flat"], default: "flat" },
    promoCode: { type: String },
    discount: { type: Number, required: true, default: 0 },
    preorderDiscount: { type: Number, default: 0 },
    isPreorder: { type: Boolean, default: false },
    expectedShipDate: { type: Date },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "bkash"],
      default: "cod",
    },
    bkashPaymentID: { type: String },
    bkashTrxID: { type: String },
    bkashRedirectUrl: { type: String },
    idempotencyKey: { type: String },
    requestFingerprint: { type: String },
    reservationExpiresAt: { type: Date },
    paymentReviewRequired: { type: Boolean, default: false },
    lastPaymentCheckAt: { type: Date },
    source: {
      type: String,
      enum: ["online", "manual"],
      default: "online",
    },
    shippingAddress: { type: shippingDetailsSchema, required: true },
    sharedCartId: { type: Schema.Types.ObjectId, ref: "SharedCart" },
    internalNote: { type: String, trim: true },
    courierProvider: { type: String, enum: ["pathao"] },
    courierConsignmentId: { type: String, trim: true },
    courierTrackingStatus: { type: String, trim: true },
    courierNote: { type: String, trim: true },
    courierBookedAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
orderSchema.index({ status: 1, reservationExpiresAt: 1 });
export const Order = model<IOrder>("Order", orderSchema);
