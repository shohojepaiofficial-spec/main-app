import mongoose, { ClientSession } from "mongoose";
import { Order, IOrder } from "../models/Order";
import { Product } from "../models/Product";
import { SharedCart } from "../models/SharedCart";

export async function restoreInventory(order: Pick<IOrder, "items">, session: ClientSession) {
  // Operations on one transaction session must be sequential.
  for (const item of order.items) {
    const filter = item.isPreorder
      ? { _id: item.product, "preorder.reserved": { $gte: item.quantity } }
      : item.variant ? { _id: item.product, "variants._id": item.variant } : { _id: item.product };
    const increments = item.isPreorder ? { "preorder.reserved": -item.quantity }
      : item.variant ? { "variants.$.stock": item.quantity, stock: item.quantity } : { stock: item.quantity };
    const result = await Product.updateOne(filter, { $inc: increments }, { session });
    if (result.matchedCount !== 1) throw Object.assign(new Error("Inventory needs review before cancellation"), { status: 409 });
  }
}

export async function transitionOrder(
  id: unknown,
  status: IOrder["status"],
  options: { owner?: string; pendingOnly?: boolean; transactionId?: string; paymentFailed?: boolean } = {},
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const current = await Order.findById(id).session(session);
      if (!current) throw Object.assign(new Error("Order not found"), { status: 404 });
      if (options.owner && current.user?.toString() !== options.owner) {
        throw Object.assign(new Error("Not authorized to change this order"), { status: 403 });
      }
      if (current.status === status) return current;
      if (current.source === "online" && current.paymentMethod === "bkash" && current.status === "pending" && ["paid", "shipped", "delivered"].includes(status) && !options.transactionId) {
        throw Object.assign(new Error("Online payment must be verified before fulfillment"), { status: 409 });
      }
      if (status === "cancelled" && current.status === "pending" && current.bkashPaymentID && !options.paymentFailed) {
        throw Object.assign(new Error("Payment must be reconciled before cancellation"), { status: 409 });
      }
      if (current.status === "cancelled" || (options.pendingOnly && current.status !== "pending")) {
        throw Object.assign(new Error("This order can no longer change to that status"), { status: 409 });
      }
      if (status === "pending" || (status === "paid" && current.status !== "pending")) {
        throw Object.assign(new Error("Order status cannot move backwards"), { status: 409 });
      }
      const updated = await Order.findOneAndUpdate(
        { _id: current._id, status: current.status },
        { $set: { status, ...(status === "cancelled" && current.bkashTrxID ? { paymentReviewRequired: true } : {}), ...(options.transactionId ? { bkashTrxID: options.transactionId } : {}) } },
        { session, new: true },
      );
      if (!updated) throw Object.assign(new Error("Order changed; please retry"), { status: 409 });
      if (status === "cancelled") {
        await restoreInventory(current, session);
        // Only a still-pending online payment may release its own cart claim.
        if (current.sharedCartId && current.paymentMethod !== "cod") {
          await SharedCart.updateOne(
            { _id: current.sharedCartId, claimedOrder: current._id, fulfilledOrder: { $exists: false } },
            { $unset: { claimedOrder: 1 } }, { session },
          );
        }
      }
      if (status === "paid" && current.sharedCartId) {
        await SharedCart.updateOne(
          { _id: current.sharedCartId, claimedOrder: current._id, fulfilledOrder: { $exists: false } },
          { $set: { fulfilledOrder: current._id, fulfilledBy: current.user } }, { session },
        );
      }
      return updated;
    });
  } finally { await session.endSession(); }
}
