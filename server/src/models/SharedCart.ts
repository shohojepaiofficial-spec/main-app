import { Schema, model, Document, Types } from "mongoose";
import { IPathaoAddress, pathaoAddressSchema } from "./PathaoAddress";

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
  // Where the order goes, set by the person asking. The payer only pays
  // (bKash) — they never see or change the full address. Links made before
  // this existed have none and can no longer be paid.
  shippingAddress?: ISharedCartAddress;
  promoCode?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ISharedCartAddress {
  fullName: string;
  phone: string;
  zila: string;
  upazila: string;
  addressLine: string;
  pathao?: IPathaoAddress;
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
    shippingAddress: {
      type: new Schema<ISharedCartAddress>(
        {
          fullName: { type: String, required: true, trim: true },
          phone: { type: String, required: true, trim: true },
          zila: { type: String, required: true, trim: true },
          upazila: { type: String, required: true, trim: true },
          addressLine: { type: String, required: true, trim: true },
          pathao: { type: pathaoAddressSchema },
        },
        { _id: false }
      ),
      default: undefined,
    },
    promoCode: { type: String, trim: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SharedCart = model<ISharedCart>("SharedCart", sharedCartSchema);
