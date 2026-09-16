import { Schema, model, Document, Types } from "mongoose";

interface ISharedCartItem {
  product: Types.ObjectId;
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
  createdAt: Date;
}

const sharedCartSchema = new Schema<ISharedCart>(
  {
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fulfilledBy: { type: Schema.Types.ObjectId, ref: "User" },
    fulfilledOrder: { type: Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SharedCart = model<ISharedCart>("SharedCart", sharedCartSchema);
