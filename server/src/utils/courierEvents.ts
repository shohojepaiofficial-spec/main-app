import type { ICourierEvent } from "../models/Order";

type CourierOrder = { courierTrackingStatus?: string; courierEvents: ICourierEvent[] };

// Records a courier status on the order: sets the latest status and adds it
// to the history, unless it is the same as the last one (refreshing Pathao
// ten times while a parcel sits in a hub adds one entry, not ten).
// A booking is always recorded. Returns whether an entry was added.
export function recordCourierStatus(order: CourierOrder, event: Omit<ICourierEvent, "at"> & { at?: Date }): boolean {
  const status = event.status.trim();
  if (!status) return false;
  order.courierTrackingStatus = status;
  const last = order.courierEvents[order.courierEvents.length - 1];
  if (event.kind !== "booked" && last?.status.toLowerCase() === status.toLowerCase()) return false;
  order.courierEvents.push({ ...event, status, at: event.at ?? new Date() });
  return true;
}
