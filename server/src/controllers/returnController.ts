import { Response } from "express";
import { validateControllerInput } from "../middleware/controllerInput";
import { AuthRequest } from "../middleware/auth";
import { Order } from "../models/Order";
import { User } from "../models/User";
import {
  ReturnRequest, IReturnRequest, RETURN_STATUSES, RETURN_TYPES, ReturnStatus,
} from "../models/ReturnRequest";
import {
  buildReturnItems, claimedQuantities, isWithinReturnWindow, itemsValue,
  refundedForOrder, returnWindowEndsAt, transitionReturn, RETURN_WINDOW_DAYS,
} from "../utils/returns";
import { isBkashLive, refundBkashPayment } from "../integrations/bkash";
import { getPathaoOrderStatus, isPathaoConfigured } from "../integrations/pathao";
import { recordCourierStatus } from "../utils/courierEvents";
import { sendEmail } from "../utils/sendEmail";
import { escapeHtml } from "../utils/escapeHtml";

// Returns, exchanges and refunds (WORK-08) — see docs/ARCHITECTURE.md's
// "Returns & refunds" section. Rules live in utils/returns.ts.

const ADMIN_PAGE_SIZE = 20;
const orderNumber = (id: unknown) => `#${String(id).slice(-6).toUpperCase()}`;

// What a customer may see of their own request: no staff note, no staff ids,
// and not what the pickup cost the store.
const CUSTOMER_FIELDS = "-staffNote -refund.refundedBy -bkashRefundStartedAt -pickup.bookedBy -pickup.fee -pickup.note";

interface CreateBody {
  orderId: string;
  type: IReturnRequest["type"];
  reason: IReturnRequest["reason"];
  details?: string;
  exchangeFor?: string;
  items: { orderItemIndex: number; quantity: number }[];
}

async function createRequest(req: AuthRequest, res: Response, createdBy: "customer" | "staff") {
  const body = req.body as CreateBody;
  const order = await Order.findById(body.orderId).populate("items.product", "name");
  // A customer asking about someone else's order gets the same 404 as a
  // missing one, so order ids can't be probed.
  if (!order || (createdBy === "customer" && order.user?.toString() !== req.userId)) {
    return res.status(404).json({ message: "Order not found" });
  }
  if (order.status !== "delivered") {
    return res.status(409).json({ message: "Only delivered orders can be returned or exchanged" });
  }
  // Staff may log a late request (their call, e.g. a manufacturing fault);
  // customers get the published window.
  if (createdBy === "customer" && !isWithinReturnWindow(order)) {
    return res.status(409).json({ message: `The ${RETURN_WINDOW_DAYS}-day return window for this order has ended` });
  }
  if (body.type === "exchange" && !body.exchangeFor) {
    return res.status(400).json({ message: "Tell us what you'd like instead" });
  }

  const existing = await ReturnRequest.find({ order: order._id }).select("status items");
  const items = buildReturnItems(order as never, body.items, claimedQuantities(existing));

  const request = await ReturnRequest.create({
    order: order._id,
    user: order.user,
    type: body.type,
    reason: body.reason,
    details: body.details || undefined,
    exchangeFor: body.type === "exchange" ? body.exchangeFor : undefined,
    items,
    createdBy,
  });
  return res.status(201).json(request);
}

export const createReturnRequest = async (req: AuthRequest, res: Response) => {
  validateControllerInput("createReturnRequest", req);
  return createRequest(req, res, "customer");
};

export const adminCreateReturnRequest = async (req: AuthRequest, res: Response) => {
  validateControllerInput("adminCreateReturnRequest", req);
  return createRequest(req, res, "staff");
};

// The signed-in customer's requests, plus — for each delivered order still
// inside its window — what's left to return, so My Orders can offer the
// button without a second round of rules on the frontend.
export const getMyReturns = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getMyReturns", req);
  const [requests, delivered] = await Promise.all([
    ReturnRequest.find({ user: req.userId }).select(CUSTOMER_FIELDS).sort({ createdAt: -1 }).lean(),
    Order.find({ user: req.userId, status: "delivered" }).select("items deliveredAt updatedAt").lean(),
  ]);
  const eligibility = delivered
    .filter((order) => isWithinReturnWindow(order))
    .map((order) => {
      const claimed = claimedQuantities(requests.filter((r) => String(r.order) === String(order._id)));
      return {
        orderId: String(order._id),
        windowEndsAt: returnWindowEndsAt(order),
        remaining: order.items.map((item, index) => Math.max(0, item.quantity - (claimed.get(index) ?? 0))),
      };
    })
    .filter((entry) => entry.remaining.some((n) => n > 0));
  res.json({ requests, eligibility, windowDays: RETURN_WINDOW_DAYS });
};

export const getAllReturns = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getAllReturns", req);
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const filter: Record<string, unknown> = {};
  const { status, type } = req.query;
  if (typeof status === "string" && (RETURN_STATUSES as readonly string[]).includes(status)) filter.status = status;
  if (typeof type === "string" && (RETURN_TYPES as readonly string[]).includes(type)) filter.type = type;

  const [items, total, counts] = await Promise.all([
    ReturnRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .populate("user", "name email")
      .populate("order", "totalAmount paymentMethod status bkashTrxID shippingAddress.fullName shippingAddress.phone createdAt")
      .populate("refund.refundedBy", "name")
      .populate("pickup.bookedBy", "name")
      .lean(),
    ReturnRequest.countDocuments(filter),
    ReturnRequest.aggregate<{ _id: ReturnStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  // How much each listed order still has available to refund, so the
  // refund form can default to (and cap at) a sensible number.
  const orderIds = [...new Set(items.map((r) => String((r.order as { _id?: unknown })?._id ?? r.order)))];
  const refunded = await ReturnRequest.aggregate<{ _id: unknown; total: number }>([
    { $match: { order: { $in: items.map((r) => (r.order as { _id?: unknown })?._id ?? r.order) }, refund: { $exists: true } } },
    { $group: { _id: "$order", total: { $sum: "$refund.amount" } } },
  ]);
  const refundedByOrder = new Map(refunded.map((row) => [String(row._id), row.total]));

  res.json({
    items: items.map((r) => {
      const order = r.order as { _id?: unknown; totalAmount?: number; paymentMethod?: string; bkashTrxID?: string } | null;
      const orderId = String(order?._id ?? r.order);
      return {
        ...r,
        itemsValue: itemsValue(r.items),
        refundableRemaining: Math.max(0, (order?.totalAmount ?? 0) - (refundedByOrder.get(orderId) ?? 0)),
        canRefundWithBkash: order?.paymentMethod === "bkash" && Boolean(order?.bkashTrxID),
      };
    }),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    counts: Object.fromEntries(RETURN_STATUSES.map((s) => [s, counts.find((c) => c._id === s)?.count ?? 0])),
    // "Refund with bKash" shows as "Coming soon" until merchant credentials
    // are live, same as checkout's bKash option.
    bkashRefundsAvailable: isBkashLive(),
  });
};

const STATUS_EMAIL: Partial<Record<ReturnStatus, (type: string) => string>> = {
  approved: (type) => `Your ${type} request has been approved. We'll be in touch about sending the item back.`,
  rejected: (type) => `Your ${type} request couldn't be approved.`,
  completed: (type) => (type === "exchange" ? "Your replacement is on its way." : "Your refund has been sent."),
};

// Fire-and-forget, like every other customer email in this app.
async function notifyCustomer(request: IReturnRequest) {
  const line = STATUS_EMAIL[request.status]?.(request.type);
  if (!line || !request.user) return;
  const user = await User.findById(request.user).select("name email");
  if (!user?.email) return;
  const message = request.customerMessage ? `\n\n${request.customerMessage}` : "";
  const order = orderNumber(request.order);
  const text = `Hi ${user.name},\n\n${line} (Order ${order})${message}\n\nYou can see the details under My Orders.\n\nShohoje Pai`;
  sendEmail({
    to: user.email,
    subject: `Update on your ${request.type} request for order ${order}`,
    text,
    html: text.split("\n\n").map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join(""),
  }).catch((err) => console.error("Return status email failed:", err.message));
}

export const updateReturnStatus = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateReturnStatus", req);
  const { status, customerMessage, staffNote, restock, replacementOrderId } = req.body as {
    status: ReturnStatus; customerMessage?: string; staffNote?: string; restock?: boolean; replacementOrderId?: string;
  };
  if (replacementOrderId && !(await Order.exists({ _id: replacementOrderId }))) {
    return res.status(400).json({ message: "Replacement order not found" });
  }
  const { request, skippedRestock } = await transitionReturn(req.params.id as string, status, {
    customerMessage, staffNote, restock, replacementOrder: replacementOrderId,
  });
  notifyCustomer(request).catch(() => undefined);
  res.json({ ...request.toObject(), skippedRestock });
};

// Shared by both refund paths: the request must be refundable and the amount
// within what the order still has left after earlier refunds.
async function checkRefundable(id: string, amount: number) {
  const request = await ReturnRequest.findById(id);
  if (!request) return { error: { status: 404, message: "Return request not found" } } as const;
  if (request.type !== "return") return { error: { status: 409, message: "Exchanges aren't refunded" } } as const;
  if (request.refund) return { error: { status: 409, message: "This request is already refunded" } } as const;
  if (!["approved", "received"].includes(request.status)) {
    return { error: { status: 409, message: "Approve the request before refunding it" } } as const;
  }
  const order = await Order.findById(request.order);
  if (!order) return { error: { status: 404, message: "Order not found" } } as const;
  const remaining = order.totalAmount - (await refundedForOrder(order._id));
  if (amount > remaining) {
    return { error: { status: 400, message: `At most ৳${remaining} can still be refunded on this order` } } as const;
  }
  return { request, order } as const;
}

// Saves the refund and, if the parcel is already back, completes the request
// in the same conditional write.
async function saveRefund(request: IReturnRequest, refund: Record<string, unknown>, extraFilter: Record<string, unknown> = {}) {
  const saved = await ReturnRequest.findOneAndUpdate(
    { _id: request._id, status: request.status, refund: { $exists: false }, ...extraFilter },
    { $set: { refund, ...(request.status === "received" ? { status: "completed" } : {}) }, $unset: { bkashRefundStartedAt: 1 } },
    { returnDocument: "after" },
  );
  if (saved) notifyCustomer(saved).catch(() => undefined);
  return saved;
}

// Money staff already sent by hand (personal bKash/Nagad, cash, bank).
export const recordRefund = async (req: AuthRequest, res: Response) => {
  validateControllerInput("recordRefund", req);
  const { amount, method, reference, note } = req.body as { amount: number; method: string; reference?: string; note?: string };
  const checked = await checkRefundable(req.params.id as string, amount);
  if ("error" in checked && checked.error) return res.status(checked.error.status).json({ message: checked.error.message });
  const { request } = checked;
  if (request.bkashRefundStartedAt) {
    return res.status(409).json({ message: "A bKash refund was started for this request — check the bKash merchant portal first" });
  }
  const saved = await saveRefund(request, {
    amount, method, reference: reference || undefined, note: note || undefined, refundedAt: new Date(), refundedBy: req.userId,
  });
  if (!saved) return res.status(409).json({ message: "This request changed; please retry" });
  res.json(saved);
};

// Refund through bKash's API against the order's own payment. Shown as
// "Coming soon" until bKash is live.
export const refundWithBkash = async (req: AuthRequest, res: Response) => {
  validateControllerInput("refundWithBkash", req);
  if (!isBkashLive()) {
    return res.status(503).json({ message: "bKash refunds are coming soon", code: "BKASH_REFUND_UNAVAILABLE" });
  }
  const { amount, reason } = req.body as { amount: number; reason?: string };
  const checked = await checkRefundable(req.params.id as string, amount);
  if ("error" in checked && checked.error) return res.status(checked.error.status).json({ message: checked.error.message });
  const { request, order } = checked;
  if (order.paymentMethod !== "bkash" || !order.bkashPaymentID || !order.bkashTrxID) {
    return res.status(400).json({ message: "This order wasn't paid with bKash — record a manual refund instead" });
  }

  // Claim the request first so a double click can't refund twice.
  const claimed = await ReturnRequest.findOneAndUpdate(
    { _id: request._id, refund: { $exists: false }, bkashRefundStartedAt: { $exists: false } },
    { $set: { bkashRefundStartedAt: new Date() } },
  );
  if (!claimed) return res.status(409).json({ message: "A refund is already in progress for this request" });

  let result;
  try {
    result = await refundBkashPayment({
      paymentID: order.bkashPaymentID,
      trxID: order.bkashTrxID,
      amount,
      sku: `return-${request.id}`,
      reason: reason || `Return for order ${orderNumber(order._id)}`,
    });
  } catch {
    // Unknown outcome (timeout, network): keep the claim so nobody refunds
    // again before checking the merchant portal.
    return res.status(502).json({ message: "No answer from bKash. Check the merchant portal before trying again." });
  }
  if (result.transactionStatus !== "Completed" || !result.refundTrxID) {
    // bKash answered with a definite refusal, so it's safe to release.
    await ReturnRequest.updateOne({ _id: request._id }, { $unset: { bkashRefundStartedAt: 1 } });
    return res.status(502).json({ message: result.statusMessage || result.errorMessage || "bKash refused the refund" });
  }
  const saved = await saveRefund(request, {
    amount, method: "bkash", reference: result.refundTrxID, note: reason || undefined, refundedAt: new Date(), refundedBy: req.userId,
  });
  if (!saved) return res.status(409).json({ message: "Refund sent, but the request changed meanwhile — record it by hand" });
  res.json(saved);
};

// Staff booked the rider pickup in Pathao's merchant panel (the API can't
// book customer → store parcels) and enter its consignment here, so the
// webhook can track it. Only while approved: before that nothing is agreed,
// after "received" the item is already back. Re-entering a different
// consignment (a rebooking) starts its history over.
export const setReturnPickup = async (req: AuthRequest, res: Response) => {
  validateControllerInput("setReturnPickup", req);
  const { consignmentId, fee, note } = req.body as { consignmentId: string; fee?: number; note?: string };
  const request = await ReturnRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Return request not found" });
  if (request.status !== "approved") {
    return res.status(409).json({ message: "Approve the request before booking its pickup" });
  }
  const clash = await ReturnRequest.exists({ _id: { $ne: request._id }, "pickup.consignmentId": consignmentId });
  if (clash || (await Order.exists({ courierConsignmentId: consignmentId }))) {
    return res.status(409).json({ message: "That consignment is already used by another order or return" });
  }

  const staff = await User.findById(req.userId).select("name");
  const sameParcel = request.pickup?.consignmentId === consignmentId;
  request.pickup = {
    provider: "pathao",
    consignmentId,
    fee,
    note: note || undefined,
    bookedAt: sameParcel ? request.pickup!.bookedAt : new Date(),
    bookedBy: sameParcel ? request.pickup!.bookedBy : (req.userId as never),
    courierTrackingStatus: sameParcel ? request.pickup!.courierTrackingStatus : undefined,
    courierEvents: sameParcel ? request.pickup!.courierEvents : [],
  };
  if (!sameParcel) {
    recordCourierStatus(request.pickup, { status: "Pickup booked", source: "manual", kind: "booked", byName: staff?.name });
  }
  await request.save();
  res.json(request);
};

// Asks Pathao for the pickup's current status (the "Refresh" button) — for
// when a webhook went missing.
export const refreshReturnPickup = async (req: AuthRequest, res: Response) => {
  validateControllerInput("refreshReturnPickup", req);
  const request = await ReturnRequest.findById(req.params.id);
  if (!request?.pickup) return res.status(404).json({ message: "This return has no pickup booked" });
  if (!isPathaoConfigured()) return res.status(503).json({ message: "Pathao isn't configured" });
  let status: string;
  try {
    ({ orderStatus: status } = await getPathaoOrderStatus(request.pickup.consignmentId));
  } catch (err) {
    return res.status(502).json({ message: (err as Error).message || "Pathao didn't answer" });
  }
  recordCourierStatus(request.pickup, { status, source: "pathao", kind: "refresh" });
  await request.save();
  res.json(request);
};
