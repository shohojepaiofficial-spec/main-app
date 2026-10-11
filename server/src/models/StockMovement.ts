import { Document, model, Schema, Types } from "mongoose";

// Why a product's (or variant's) stock moved. Pre-order lines never move
// stock, so they never appear here.
export const STOCK_MOVEMENT_REASONS = ["sale", "cancellation", "return", "adjustment"] as const;
export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

// One append-only line of the stock ledger (WORK-09). Written in the same
// transaction as the stock change itself, so the ledger can't disagree with
// the product. `variantLabel` is a snapshot so the history still reads after
// the variant is renamed or deleted.
export interface IStockMovement extends Document {
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  variantLabel?: string;
  change: number;
  reason: StockMovementReason;
  order?: Types.ObjectId;
  returnRequest?: Types.ObjectId;
  // Set for staff edits (adjustments); order-linked lines are traced through
  // the order and its Change History instead.
  actor?: Types.ObjectId;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variant: { type: Schema.Types.ObjectId },
    variantLabel: { type: String, maxlength: 200 },
    change: { type: Number, required: true },
    reason: { type: String, enum: STOCK_MOVEMENT_REASONS, required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    returnRequest: { type: Schema.Types.ObjectId, ref: "ReturnRequest" },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

stockMovementSchema.index({ product: 1, createdAt: -1, _id: -1 });

export const StockMovement = model<IStockMovement>("StockMovement", stockMovementSchema);
