import { Schema, model, Document, Types } from "mongoose";

interface ISharedCartItem {
  product: Types.ObjectId;
  // Which variant, for a product with options — see Product.ts.
  variant?: Types.ObjectId;
  quantity: number;
}

export interface ISharedCart extends Document {
  items: ISharedCartItem[];
  // Who's asking — shown to whoever opens the link ("X wants you to pay for
  // this order"), not required to check out with it.
  createdBy: Types.ObjectId;
  // Set once someone actually places an order from this link, so it can't
  // be completed twice and the link's page can show "already paid".
  fulfilledBy?: Types.ObjectId;
  fulfilledOrder?: Types.ObjectId;
  claimedOrder?: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const sharedCartSchema = new Schema<ISharedCart>(
  {
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        variant: { type: Schema.Types.ObjectId },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fulfilledBy: { type: Schema.Types.ObjectId, ref: "User" },
    fulfilledOrder: { type: Schema.Types.ObjectId, ref: "Order" },
    claimedOrder: { type: Schema.Types.ObjectId, ref: "Order" },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SharedCart = model<ISharedCart>("SharedCart", sharedCartSchema);
