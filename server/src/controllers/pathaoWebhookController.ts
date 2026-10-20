import { Request, Response } from "express";
import { Types } from "mongoose";
import { Order } from "../models/Order";
import { ReturnRequest } from "../models/ReturnRequest";
import { recordCourierStatus } from "../utils/courierEvents";
import { transitionOrder } from "../utils/orderTransitions";
import {
  INTEGRATION_HEADER,
  isPathaoWebhookConfigured,
  pathaoSignatureScheme,
  readPathaoWebhook,
  storeStatusFor,
} from "../integrations/pathaoWebhook";

// The order a Merchant Order ID points at. A Pathao booking matches as
// before; an order with no booking yet (staff booked on Pathao's own site
// and pasted our order id) is linked here: the consignment number from
// this update is saved on it, so nobody has to type it. Never overwrites
// a different number, never links an order booked with another courier,
// and never takes a number another order already has.
async function orderByMerchantId(merchantOrderId?: string, consignmentId?: string) {
  if (!merchantOrderId || !Types.ObjectId.isValid(merchantOrderId)) return null;
  const order = await Order.findById(merchantOrderId);
  if (!order || order.courierProvider === "other") return null;
  if (order.courierConsignmentId) return order.courierProvider === "pathao" ? order : null;
  if (!consignmentId) return order.courierProvider === "pathao" ? order : null;
  if (await Order.exists({ courierConsignmentId: consignmentId })) return null;

  order.courierProvider = "pathao";
  order.courierConsignmentId = consignmentId;
  order.courierAwaitingSince = undefined;
  order.courierVerifiedAt = new Date();
  order.courierBookedAt = order.courierBookedAt ?? new Date();
  recordCourierStatus(order, { status: `Linked by Pathao (${consignmentId})`, source: "pathao", kind: "booked" });
  console.log(`Pathao webhook: linked consignment ${consignmentId} to order ${order.id}`);
  return order;
}

// Pathao pushes courier status changes here (see integrations/pathaoWebhook.ts).
// Public, but every update must carry a valid signature. Always answers 202
// with the integration header, which is how Pathao's panel accepts the URL.
export const pathaoWebhook = async (req: Request & { rawBody?: Buffer }, res: Response) => {
  const integration = process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET;
  if (integration) res.setHeader(INTEGRATION_HEADER, integration);

  const update = readPathaoWebhook(req.body);
  // Pathao's "is this URL alive?" check has nothing to record.
  if (!update) return res.status(202).json({ received: true });

  const scheme = isPathaoWebhookConfigured() ? pathaoSignatureScheme(req.get("X-Pathao-Signature"), req.rawBody) : null;
  if (!scheme) {
    console.warn("Pathao webhook rejected: missing or invalid signature");
    return res.status(401).json({ message: "Invalid signature" });
  }
  // Until PATHAO_WEBHOOK_SIGNATURE pins one form, say which one Pathao uses.
  if (!process.env.PATHAO_WEBHOOK_SIGNATURE) console.log(`Pathao webhook: signature matched as "${scheme}" — set PATHAO_WEBHOOK_SIGNATURE=${scheme}`);

  const order =
    (update.consignmentId && (await Order.findOne({ courierConsignmentId: update.consignmentId }))) ||
    (await orderByMerchantId(update.merchantOrderId, update.consignmentId));
  // Not an order's parcel: maybe a return pickup (customer → store). Only
  // its history is recorded; staff still mark the item received and decide
  // on restocking.
  const pickup = !order && update.consignmentId
    ? await ReturnRequest.findOne({ "pickup.consignmentId": update.consignmentId })
    : null;
  const matched = order ? `order ${order.id}` : pickup ? `return ${pickup.id}` : "no match";
  console.log(`Pathao webhook: consignment ${update.consignmentId ?? "-"} → "${update.status}" (${matched})`);
  if (pickup?.pickup) {
    recordCourierStatus(pickup.pickup, { status: update.status, source: "pathao", kind: "webhook" });
    await pickup.save();
  }
  if (!order) return res.status(202).json({ received: true });

  recordCourierStatus(order, { status: update.status, source: "pathao", kind: "webhook" });
  order.courierCheckedAt = new Date();
  await order.save();

  // Off until real webhooks confirm Pathao's status names.
  const target = process.env.PATHAO_WEBHOOK_AUTO_STATUS === "true" ? storeStatusFor(update.status) : null;
  if (target && order.status !== target && !(target === "shipped" && order.status === "delivered")) {
    try {
      await transitionOrder(order.id, target, { actor: { name: "Pathao (automatic)" } });
    } catch (err) {
      console.warn(`Pathao webhook: couldn't move order ${order.id} to ${target}:`, (err as Error).message);
    }
  }
  res.status(202).json({ received: true });
};
