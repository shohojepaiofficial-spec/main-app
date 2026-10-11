import mongoose, { ClientSession, Types } from "mongoose";
import type { IOrder } from "../models/Order";
import { Product } from "../models/Product";
import { orderStockMovements, recordStockMovements } from "./stockLedger";
import {
  ReturnRequest, IReturnItem, IReturnRequest, ReturnStatus,
} from "../models/ReturnRequest";

// The rules behind returns/exchanges/refunds (WORK-08). Controllers call
// these; nothing here touches req/res.

// Matches the public /returns policy page.
export const RETURN_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const httpError = (message: string, status: number) => Object.assign(new Error(message), { status });

export function returnWindowEndsAt(order: Pick<IOrder, "deliveredAt" | "updatedAt">): Date {
  // Orders delivered before deliveredAt existed fall back to their last
  // update, which for a delivered order is (almost always) the delivery.
  const deliveredAt = order.deliveredAt ?? order.updatedAt;
  return new Date(new Date(deliveredAt).getTime() + RETURN_WINDOW_DAYS * DAY_MS);
}

export function isWithinReturnWindow(order: Pick<IOrder, "deliveredAt" | "updatedAt">, now = new Date()): boolean {
  return now.getTime() <= returnWindowEndsAt(order).getTime();
}

// Which statuses each status may move to. Deliberately strict (unlike order
// statuses): a refund or restock must never happen twice.
export const RETURN_TRANSITIONS: Record<ReturnStatus, readonly ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["completed"],
  rejected: [],
  completed: [],
};

export function canTransition(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_TRANSITIONS[from].includes(to);
}

// Units of each order line already covered by an open or finished request
// (rejected ones free their units again).
export function claimedQuantities(existing: Pick<IReturnRequest, "status" | "items">[]): Map<number, number> {
  const claimed = new Map<number, number>();
  for (const request of existing) {
    if (request.status === "rejected") continue;
    for (const item of request.items) {
      claimed.set(item.orderItemIndex, (claimed.get(item.orderItemIndex) ?? 0) + item.quantity);
    }
  }
  return claimed;
}

type OrderLine = IOrder["items"][number] & { product: Types.ObjectId | { _id: Types.ObjectId; name?: string } };

// Turns `[{orderItemIndex, quantity}]` from the request body into snapshot
// lines, refusing anything the order doesn't have or that's already claimed.
export function buildReturnItems(
  order: { items: OrderLine[] },
  requested: { orderItemIndex: number; quantity: number }[],
  claimed: Map<number, number>,
): IReturnItem[] {
  if (requested.length === 0) throw httpError("Pick at least one item", 400);
  const seen = new Set<number>();
  return requested.map(({ orderItemIndex, quantity }) => {
    const line = order.items[orderItemIndex];
    if (!line || seen.has(orderItemIndex)) throw httpError("That item isn't part of this order", 400);
    seen.add(orderItemIndex);
    const available = line.quantity - (claimed.get(orderItemIndex) ?? 0);
    if (quantity < 1 || quantity > available) {
      throw httpError(available > 0 ? `You can return at most ${available} of that item` : "That item already has a return request", 400);
    }
    const product = line.product as { _id?: Types.ObjectId; name?: string };
    const productId = product._id ?? (line.product as Types.ObjectId);
    return {
      orderItemIndex,
      product: productId,
      ...(line.variant ? { variant: line.variant } : {}),
      name: product.name ?? "Product",
      ...(line.variantLabel ? { variantLabel: line.variantLabel } : {}),
      quantity,
      price: line.price,
    };
  });
}

// What the returned units were bought for — the default refund suggestion.
export function itemsValue(items: Pick<IReturnItem, "price" | "quantity">[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Money already refunded against an order across all its requests.
export async function refundedForOrder(orderId: Types.ObjectId | string, session?: ClientSession): Promise<number> {
  const [row] = await ReturnRequest.aggregate<{ total: number }>([
    { $match: { order: new Types.ObjectId(String(orderId)), refund: { $exists: true } } },
    { $group: { _id: null, total: { $sum: "$refund.amount" } } },
  ]).session(session ?? null);
  return row?.total ?? 0;
}

// Puts received units back on the shelf. A returned pre-order unit is now
// physical stock too, so it goes to stock, not back to preorder.reserved.
// A deleted variant has nowhere to go and is skipped (same reasoning as
// order cancellation); the count of skipped lines is returned so staff see it.
export async function restockReturnItems(
  items: IReturnItem[],
  session: ClientSession,
  refs: { order?: Types.ObjectId | string; returnRequest?: Types.ObjectId | string } = {},
): Promise<number> {
  let skipped = 0;
  const restocked: IReturnItem[] = [];
  for (const item of items) {
    const result = item.variant
      ? await Product.updateOne(
        { _id: item.product, "variants._id": item.variant },
        { $inc: { "variants.$.stock": item.quantity, stock: item.quantity } },
        { session },
      )
      : await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
    if (result.matchedCount !== 1) skipped += 1;
    else restocked.push(item);
  }
  // Returned pre-order units are physical now, so they count like any other.
  await recordStockMovements(orderStockMovements(restocked, "return", refs, true), session);
  return skipped;
}

// Moves a request from its current status to `to`, conditioned on nobody
// having moved it in between. On "received" with `restock`, stock moves in
// the same transaction, so a retry can't restock twice.
export async function transitionReturn(
  id: string,
  to: ReturnStatus,
  fields: { customerMessage?: string; staffNote?: string; restock?: boolean; replacementOrder?: string } = {},
) {
  const session = await mongoose.startSession();
  try {
    let skipped = 0;
    const updated = await session.withTransaction(async () => {
      const current = await ReturnRequest.findById(id).session(session);
      if (!current) throw httpError("Return request not found", 404);
      if (!canTransition(current.status, to)) {
        throw httpError(`A ${current.status} request can't be marked ${to}`, 409);
      }
      if (to === "completed" && current.type === "return" && !current.refund) {
        throw httpError("Record the refund first", 409);
      }
      const set: Record<string, unknown> = { status: to };
      if (fields.customerMessage !== undefined) set.customerMessage = fields.customerMessage;
      if (fields.staffNote !== undefined) set.staffNote = fields.staffNote;
      if (to === "completed" && fields.replacementOrder) set.replacementOrder = fields.replacementOrder;
      if (to === "received" && fields.restock && !current.restocked) {
        skipped = await restockReturnItems(current.items, session, { order: current.order, returnRequest: current._id as Types.ObjectId });
        set.restocked = true;
      }
      const result = await ReturnRequest.findOneAndUpdate(
        { _id: current._id, status: current.status },
        { $set: set },
        { session, returnDocument: "after" },
      );
      if (!result) throw httpError("This request changed; please retry", 409);
      return result;
    });
    return { request: updated, skippedRestock: skipped };
  } finally {
    await session.endSession();
  }
}
