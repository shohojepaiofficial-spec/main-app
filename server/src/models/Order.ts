import { Schema, model, Document, Types } from "mongoose";

interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
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
      },
    ],
    itemsTotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    deliveryFeeSource: { type: String, enum: ["pathao", "flat"], default: "flat" },
    promoCode: { type: String },
    discount: { type: Number, required: true, default: 0 },
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

export const Order = model<IOrder>("Order", orderSchema);
