import { Schema, model, Document, Types } from "mongoose";

// A customer's (or a staff-logged) request to send items back from a
// delivered order — see docs/ARCHITECTURE.md's "Returns & refunds" section.
//
// Flow: requested → approved | rejected → received → completed.
// "completed" means refunded (type "return") or replacement sent
// (type "exchange"). Transitions and their rules live in utils/returns.ts.
export const RETURN_TYPES = ["return", "exchange"] as const;
export type ReturnType = (typeof RETURN_TYPES)[number];

export const RETURN_STATUSES = ["requested", "approved", "rejected", "received", "completed"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_REASONS = [
  "damaged", "wrong_item", "size_fit", "not_as_described", "changed_mind", "other",
] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

// "bkash" = refunded through bKash's Refund API against the order's own
// payment (only once bKash is live — integrations/bkash.ts#refundBkashPayment).
// Every other method is money staff sent by hand and recorded here.
export const REFUND_METHODS = ["bkash", "bkash_personal", "nagad_personal", "cash", "bank", "other"] as const;
export type RefundMethod = (typeof REFUND_METHODS)[number];

export interface IReturnItem {
  // Index into Order.items — the snapshot of exactly which line (and
  // variant) is coming back.
  orderItemIndex: number;
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  name: string;
  variantLabel?: string;
  quantity: number;
  // Unit price paid, copied from the order line.
  price: number;
}

export interface IRefund {
  amount: number;
  method: RefundMethod;
  // bKash refund trxID, a personal-transfer trxID, a bank reference, etc.
  reference?: string;
  note?: string;
  refundedAt: Date;
  refundedBy: Types.ObjectId;
}

export interface IReturnRequest extends Document {
  order: Types.ObjectId;
  // The order's owner; absent for a manual order with no account.
  user?: Types.ObjectId;
  type: ReturnType;
  status: ReturnStatus;
  items: IReturnItem[];
  reason: ReturnReason;
  details?: string;
  // Exchange only: what the customer wants instead ("Size L", "Blue").
  exchangeFor?: string;
  // "staff" = logged from /admin/returns for a phone/WhatsApp request.
  createdBy: "customer" | "staff";
  // Shown to the customer (e.g. why it was rejected, what happens next).
  customerMessage?: string;
  // Admin-only.
  staffNote?: string;
  // Whether received units were put back into stock (once, on "received").
  restocked: boolean;
  refund?: IRefund;
  // Set while a bKash refund call is in flight, so two clicks can never
  // refund twice. Left set after a crash mid-call: staff check the bKash
  // merchant portal before recording the outcome by hand.
  bkashRefundStartedAt?: Date;
  // Exchange only: the no-charge replacement order staff created.
  replacementOrder?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const returnItemSchema = new Schema<IReturnItem>(
  {
    orderItemIndex: { type: Number, required: true, min: 0 },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variant: { type: Schema.Types.ObjectId },
    name: { type: String, required: true },
    variantLabel: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const refundSchema = new Schema<IRefund>(
  {
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: REFUND_METHODS, required: true },
    reference: { type: String, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 1000 },
    refundedAt: { type: Date, required: true },
    refundedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const returnRequestSchema = new Schema<IReturnRequest>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    type: { type: String, enum: RETURN_TYPES, required: true },
    status: { type: String, enum: RETURN_STATUSES, default: "requested" },
    items: { type: [returnItemSchema], validate: (v: unknown[]) => v.length > 0 },
    reason: { type: String, enum: RETURN_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 2000 },
    exchangeFor: { type: String, trim: true, maxlength: 200 },
    createdBy: { type: String, enum: ["customer", "staff"], required: true },
    customerMessage: { type: String, trim: true, maxlength: 1000 },
    staffNote: { type: String, trim: true, maxlength: 2000 },
    restocked: { type: Boolean, default: false },
    refund: { type: refundSchema, default: undefined },
    bkashRefundStartedAt: { type: Date },
    replacementOrder: { type: Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: true }
);

returnRequestSchema.index({ status: 1, createdAt: -1 });

export const ReturnRequest = model<IReturnRequest>("ReturnRequest", returnRequestSchema);
