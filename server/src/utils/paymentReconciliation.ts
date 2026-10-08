import { Order } from "../models/Order";
import { queryBkashPayment, type BkashPaymentResult } from "../integrations/bkash";
import { transitionOrder } from "./orderTransitions";

export async function reconcilePayment(order: InstanceType<typeof Order>, result: BkashPaymentResult) {
  if (result.transactionStatus === "Completed") {
    if (!result.trxID || !result.amount || Number(result.amount) !== order.totalAmount) {
      await Order.updateOne({ _id: order._id }, { $set: { paymentReviewRequired: true } });
      return "error";
    }
    try {
      await transitionOrder(order.id, "paid", { pendingOnly: true, transactionId: result.trxID });
      return "success";
    } catch (error) {
      if ((error as { status?: number }).status !== 409) throw error;
      await Order.updateOne({ _id: order._id }, { $set: { paymentReviewRequired: true, bkashTrxID: result.trxID } });
      return "error";
    }
  }
  if (["Cancelled", "Canceled", "Failed", "Expired"].includes(result.transactionStatus ?? "")) {
    await transitionOrder(order.id, "cancelled", { pendingOnly: true, paymentFailed: true });
    return "failed";
  }
  // Initiated/unknown is not proof that funds cannot arrive. Hold inventory.
  await Order.updateOne({ _id: order._id }, { $set: { paymentReviewRequired: true } });
  return "pending";
}

export async function reconcileExpiredReservations() {
  const orders = await Order.find({ status: "pending", paymentMethod: "bkash", reservationExpiresAt: { $lte: new Date() } }).sort({ lastPaymentCheckAt: 1, reservationExpiresAt: 1 }).limit(50);
  for (const order of orders) {
    try {
      await Order.updateOne({ _id: order._id }, { $set: { lastPaymentCheckAt: new Date() } });
      if (!order.bkashPaymentID) await transitionOrder(order.id, "cancelled", { pendingOnly: true });
      else await reconcilePayment(order, await queryBkashPayment(order.bkashPaymentID));
    } catch {
      await Order.updateOne({ _id: order._id }, { $set: { paymentReviewRequired: true } });
    }
  }
}

export function startReservationWorker() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await reconcileExpiredReservations(); }
    catch { console.error("Reservation reconciliation failed; retrying next interval"); }
    finally { running = false; }
  }, 60_000);
  timer.unref();
  return timer;
}
