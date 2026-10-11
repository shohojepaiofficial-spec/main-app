import { Response } from "express";
import { validateControllerInput } from "../middleware/controllerInput";
import { AuthRequest } from "../middleware/auth";
import { Order } from "../models/Order";
import { ReturnRequest } from "../models/ReturnRequest";
import { resolveAnalyticsRange } from "../utils/analyticsRange";
import { describePaymentIssue } from "../utils/paymentIssues";
import { reconcilePayment } from "../utils/paymentReconciliation";
import { transitionOrder } from "../utils/orderTransitions";
import { isBkashConfigured, queryBkashPayment } from "../integrations/bkash";

// Payment reconciliation dashboard (WORK-11) — see docs/ARCHITECTURE.md's
// "Payment reconciliation" section. Orders the automatic bKash checks
// couldn't settle land here for a person to decide.

// A reservation is "stale" once the one-minute worker has had a few chances
// to settle it and hasn't.
const STALE_AFTER_MS = 5 * 60 * 1000;
const LIST_LIMIT = 100;
const ORDER_FIELDS = "status totalAmount paymentMethod bkashPaymentID bkashTrxID reservationExpiresAt lastPaymentCheckAt paymentReviewRequired paymentReviewNote paymentReviewResolvedAt createdAt shippingAddress.fullName shippingAddress.phone user";

const withIssue = <T extends Parameters<typeof describePaymentIssue>[0]>(order: T) => ({ ...order, issue: describePaymentIssue(order) });

export const getReconciliation = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getReconciliation", req);
  const { preset, since } = resolveAnalyticsRange(req.query.range);
  const created = since ? { createdAt: { $gte: since } } : {};
  const settled = { status: { $in: ["paid", "shipped", "delivered"] } };

  const [needsReview, stale, resolved, online, cod, refunds] = await Promise.all([
    Order.find({ paymentReviewRequired: true }).select(ORDER_FIELDS).populate("user", "name email").sort({ createdAt: -1 }).limit(LIST_LIMIT).lean(),
    Order.find({
      status: "pending", paymentMethod: "bkash", paymentReviewRequired: { $ne: true },
      reservationExpiresAt: { $lte: new Date(Date.now() - STALE_AFTER_MS) },
    }).select(ORDER_FIELDS).populate("user", "name email").sort({ reservationExpiresAt: 1 }).limit(LIST_LIMIT).lean(),
    Order.find({ paymentReviewResolvedAt: { $exists: true } }).select(ORDER_FIELDS).populate("paymentReviewResolvedBy", "name").sort({ paymentReviewResolvedAt: -1 }).limit(20).lean(),
    Order.aggregate<{ total: number; count: number }>([
      { $match: { ...created, ...settled, paymentMethod: "bkash", bkashTrxID: { $exists: true } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    // Cash on Delivery is only money in hand once delivered.
    Order.aggregate<{ total: number; count: number }>([
      { $match: { ...created, paymentMethod: "cod", status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    ReturnRequest.aggregate<{ _id: string; total: number; count: number }>([
      { $match: { refund: { $exists: true }, ...(since ? { "refund.refundedAt": { $gte: since } } : {}) } },
      { $group: { _id: "$refund.method", total: { $sum: "$refund.amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const onlineTotal = online[0]?.total ?? 0;
  const codTotal = cod[0]?.total ?? 0;
  const refundTotal = refunds.reduce((sum, row) => sum + row.total, 0);
  res.json({
    range: { preset, from: since, to: new Date() },
    summary: {
      onlineCollected: { total: onlineTotal, count: online[0]?.count ?? 0 },
      codCollected: { total: codTotal, count: cod[0]?.count ?? 0 },
      refunded: { total: refundTotal, count: refunds.reduce((sum, row) => sum + row.count, 0), byMethod: refunds.map(({ _id, total, count }) => ({ method: _id, total, count })) },
      net: onlineTotal + codTotal - refundTotal,
      needsReviewCount: needsReview.length,
      staleCount: stale.length,
    },
    needsReview: needsReview.map(withIssue),
    stale: stale.map(withIssue),
    resolved,
    bkashConnected: isBkashConfigured(),
  });
};

// Asks bKash what happened to this order's payment. A pending order is
// settled through the same rules the automatic worker uses; anything else
// only shows bKash's answer, never changes the order.
export const recheckPayment = async (req: AuthRequest, res: Response) => {
  validateControllerInput("recheckPayment", req);
  if (!isBkashConfigured()) return res.status(503).json({ message: "bKash isn't connected yet" });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!order.bkashPaymentID) return res.status(400).json({ message: "This order never started a bKash payment" });

  let result;
  try {
    result = await queryBkashPayment(order.bkashPaymentID);
  } catch {
    return res.status(502).json({ message: "No answer from bKash — try again in a minute" });
  }
  await Order.updateOne({ _id: order._id }, { $set: { lastPaymentCheckAt: new Date() } });

  let outcome: string = "unchanged";
  if (order.status === "pending") {
    outcome = await reconcilePayment(order, result);
    // A definite answer settles the review; "pending"/"error" keep it open.
    if (outcome === "success" || outcome === "failed") {
      await Order.updateOne({ _id: order._id }, {
        $set: { paymentReviewRequired: false, paymentReviewNote: `Re-checked with bKash: ${result.transactionStatus}`, paymentReviewResolvedAt: new Date(), paymentReviewResolvedBy: req.userId },
      });
    }
  }
  res.json({
    outcome,
    bkash: { transactionStatus: result.transactionStatus, trxID: result.trxID, amount: result.amount, statusMessage: result.statusMessage },
  });
};

// A person's decision on a flagged order. "paid"/"cancelled" move a still-
// pending order through the normal conditional transition (cancelling
// restores stock); "dismiss" only closes the review (e.g. after refunding a
// late payment by hand). The note is required — it's the audit record.
export const resolvePaymentReview = async (req: AuthRequest, res: Response) => {
  validateControllerInput("resolvePaymentReview", req);
  const { outcome, note, transactionId } = req.body as { outcome: "paid" | "cancelled" | "dismiss"; note: string; transactionId?: string };
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const issue = describePaymentIssue(order);
  if (!issue.allowed.includes(outcome)) {
    return res.status(409).json({ message: "That resolution doesn't fit this order's state" });
  }
  if (outcome === "paid") {
    if (!transactionId) return res.status(400).json({ message: "Enter the bKash transaction ID from the merchant portal" });
    await transitionOrder(order.id, "paid", { pendingOnly: true, transactionId });
  } else if (outcome === "cancelled") {
    await transitionOrder(order.id, "cancelled", { pendingOnly: true, paymentFailed: true });
  }

  const updated = await Order.findByIdAndUpdate(order._id, {
    $set: { paymentReviewRequired: false, paymentReviewNote: note, paymentReviewResolvedAt: new Date(), paymentReviewResolvedBy: req.userId },
  }, { returnDocument: "after" }).select(ORDER_FIELDS);
  res.json(updated);
};
