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

// Only "cod" is actually processed today — the others are exposed in the
// schema/API now so the checkout UI can show them (as "coming soon") ahead
// of a real payment-gateway integration, without a breaking schema change
// once one is wired up.
export type PaymentMethod = "cod" | "bkash" | "nagad" | "card";

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
  promoCode?: string;
  discount: number;
  totalAmount: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  paymentMethod: PaymentMethod;
  source: OrderSource;
  shippingAddress: IShippingDetails;
  // Set when this order was placed by fulfilling someone else's shared-cart
  // "ask someone else to pay" link, rather than from the buyer's own cart.
  sharedCartId?: Types.ObjectId;
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
      enum: ["cod", "bkash", "nagad", "card"],
      default: "cod",
    },
    source: {
      type: String,
      enum: ["online", "manual"],
      default: "online",
    },
    shippingAddress: { type: shippingDetailsSchema, required: true },
    sharedCartId: { type: Schema.Types.ObjectId, ref: "SharedCart" },
  },
  { timestamps: true }
);

export const Order = model<IOrder>("Order", orderSchema);
