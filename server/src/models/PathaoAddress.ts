import { Schema } from "mongoose";

// An address in Pathao's own terms, saved next to our zila/upazila when the
// customer picked it from Pathao's lists at checkout. Lets staff book the
// parcel without picking the location again. Names are Pathao's, stored so
// the order still reads correctly if Pathao renames something later.
// Embedded in Order.shippingAddress, SharedCart.shippingAddress and
// User.deliveryLocation.
export interface IPathaoAddress {
  cityId: number;
  cityName: string;
  zoneId: number;
  zoneName: string;
  areaId?: number;
  areaName?: string;
}

export const pathaoAddressSchema = new Schema<IPathaoAddress>(
  {
    cityId: { type: Number, required: true },
    cityName: { type: String, required: true, trim: true },
    zoneId: { type: Number, required: true },
    zoneName: { type: String, required: true, trim: true },
    areaId: { type: Number },
    areaName: { type: String, trim: true },
  },
  { _id: false }
);
