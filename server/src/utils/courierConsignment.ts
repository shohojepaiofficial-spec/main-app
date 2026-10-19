import { Types } from "mongoose";
import { Order } from "../models/Order";
import { ReturnRequest } from "../models/ReturnRequest";

// Consignment numbers typed by staff are tidied before anything else looks
// at them: spaces and dashes removed (copied with formatting), upper case.
// Anything that still isn't 4–40 letters/digits (a phone number with a +,
// a pasted link) is refused.
export function normalizeConsignmentId(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidConsignmentId(value: string): boolean {
  return /^[A-Z0-9]{4,40}$/.test(value);
}

// Another order, or a return pickup, already using this number — two
// orders sharing one would send one parcel's updates to the wrong order.
export async function consignmentInUse(consignmentId: string, exceptOrderId: Types.ObjectId | string): Promise<string | null> {
  const other = await Order.findOne({ courierConsignmentId: consignmentId, _id: { $ne: exceptOrderId } }).select("_id");
  if (other) return `order #${String(other._id).slice(-6).toUpperCase()}`;
  const pickup = await ReturnRequest.findOne({ "pickup.consignmentId": consignmentId }).select("_id order");
  if (pickup) return `a return pickup for order #${String(pickup.order).slice(-6).toUpperCase()}`;
  return null;
}

// Compared on the last 10 digits — Pathao and we may write the country
// code differently (+880 / 0).
export function samePhone(a?: string, b?: string): boolean {
  const digits = (s?: string) => (s ?? "").replace(/\D/g, "").slice(-10);
  return !!a && !!b && digits(a).length >= 4 && digits(a) === digits(b);
}
