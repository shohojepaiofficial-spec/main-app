import { Schema, model, Document } from "mongoose";

export interface IStoreLocation extends Document {
  name: string;
  address: string;
  phone?: string;
  mapUrl?: string;
  images: string[];
  // Lower sorts first on the storefront, same convention as Category.
  order: number;
  // Lets staff stage/hide a location without losing its content — same
  // convention as Banner.isActive. Public GET only ever returns active ones.
  isActive: boolean;
  createdAt: Date;
}

const storeLocationSchema = new Schema<IStoreLocation>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    address: { type: String, required: true, trim: true, minlength: 5, maxlength: 300 },
    phone: { type: String, trim: true, maxlength: 20 },
    mapUrl: { type: String, trim: true, maxlength: 500 },
    images: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const StoreLocation = model<IStoreLocation>("StoreLocation", storeLocationSchema);
