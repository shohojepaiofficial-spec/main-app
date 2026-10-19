import { Types } from "mongoose";
import { Order } from "../models/Order";
import { notifyStaff } from "./notify";
import { staffPaymentReviewNotification } from "./notificationMessages";

// Marks an order's payment for a person to settle at /admin/payments, and
// alerts staff — but only the first time it's flagged, since the
// reservation worker re-checks the same orders every minute.
export async function flagPaymentReview(
  orderId: Types.ObjectId | string,
  reason: string,
  extra: Record<string, unknown> = {}
) {
  const before = await Order.findOneAndUpdate(
    { _id: orderId },
    { $set: { paymentReviewRequired: true, ...extra } },
    { returnDocument: "before", projection: { paymentReviewRequired: 1 } }
  );
  if (before && !before.paymentReviewRequired) {
    notifyStaff("orders:manage", staffPaymentReviewNotification(String(orderId), reason));
  }
}
