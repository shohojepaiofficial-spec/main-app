import type { ClientSession, Types } from "mongoose";
import { PromoCode, type IPromoCode } from "../models/PromoCode";
import { Order } from "../models/Order";

// Promo code use limits (SEC-22). An order that applies a code claims one
// use inside its own transaction; a cancelled order gives it back.
//
// The claim always increments `usedCount`, even for a code with no limits:
// two checkouts racing for the last use (or one customer placing two orders
// at once) then write the same document, MongoDB aborts one transaction as
// a write conflict, and withTransaction retries it against the new count.

const refused = (message: string) => Object.assign(new Error(message), { status: 409 });

export function promoFullyUsed(promo: Pick<IPromoCode, "maxUses" | "usedCount">): boolean {
  return !!promo.maxUses && (promo.usedCount ?? 0) >= promo.maxUses;
}

// Who an order is for. A "customer" for the per-customer limit is the
// account or the delivery phone, so a second account with the same phone
// can't reuse a one-per-customer code. Phones are stored normalized
// (normalizeBdPhone), so "+8801712..." and "01712..." are the same number.
export interface PromoCustomer {
  user?: Types.ObjectId | string;
  phone?: string;
}

export async function claimPromoUse(code: string | undefined, customer: PromoCustomer, session: ClientSession) {
  if (!code) return;
  const promo = await PromoCode.findOne({ code }).session(session);
  if (!promo) return;
  const sameCustomer = [
    ...(customer.user ? [{ user: customer.user }] : []),
    ...(customer.phone ? [{ "shippingAddress.phone": customer.phone }] : []),
  ];
  if (promo.maxUsesPerCustomer && sameCustomer.length) {
    const used = await Order.countDocuments({ promoCode: code, status: { $ne: "cancelled" }, $or: sameCustomer }).session(session);
    if (used >= promo.maxUsesPerCustomer) {
      throw refused(promo.maxUsesPerCustomer === 1
        ? "This promo code has already been used by this account or phone number."
        : `This promo code has already been used ${used} times by this account or phone number.`);
    }
  }
  const claimed = await PromoCode.updateOne(
    { _id: promo._id, ...(promo.maxUses ? { usedCount: { $lt: promo.maxUses } } : {}) },
    { $inc: { usedCount: 1 } },
    { session },
  );
  if (!claimed.modifiedCount) throw refused("This promo code has been fully used. Remove it to place your order.");
}

export async function releasePromoUse(code: string | undefined, session: ClientSession) {
  if (!code) return;
  await PromoCode.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
}
