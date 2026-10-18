import { Request, Response } from "express";
import { Types } from "mongoose";
import { Order } from "../models/Order";
import { recordCourierStatus } from "../utils/courierEvents";
import { transitionOrder } from "../utils/orderTransitions";
import {
  INTEGRATION_HEADER,
  isPathaoWebhookConfigured,
  readPathaoWebhook,
  storeStatusFor,
  verifyPathaoSignature,
} from "../integrations/pathaoWebhook";

// Pathao pushes courier status changes here (see integrations/pathaoWebhook.ts).
// Public, but every update must carry a valid signature. Always answers 202
// with the integration header, which is how Pathao's panel accepts the URL.
export const pathaoWebhook = async (req: Request & { rawBody?: Buffer }, res: Response) => {
  const integration = process.env.PATHAO_WEBHOOK_INTEGRATION_SECRET;
  if (integration) res.setHeader(INTEGRATION_HEADER, integration);

  const update = readPathaoWebhook(req.body);
  // Pathao's "is this URL alive?" check has nothing to record.
  if (!update) return res.status(202).json({ received: true });

  if (!isPathaoWebhookConfigured() || !verifyPathaoSignature(req.get("X-Pathao-Signature"), req.rawBody)) {
    console.warn("Pathao webhook rejected: missing or invalid signature");
    return res.status(401).json({ message: "Invalid signature" });
  }

  const order =
    (update.consignmentId && (await Order.findOne({ courierConsignmentId: update.consignmentId }))) ||
    (update.merchantOrderId && Types.ObjectId.isValid(update.merchantOrderId)
      ? await Order.findOne({ _id: update.merchantOrderId, courierProvider: "pathao" })
      : null);
  console.log(`Pathao webhook: consignment ${update.consignmentId ?? "-"} → "${update.status}" (${order ? `order ${order.id}` : "no matching order"})`);
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
