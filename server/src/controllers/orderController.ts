import { Request, Response } from "express";
import { format } from "date-fns";
import mongoose, { ClientSession } from "mongoose";
import { Order, OrderSource, PaymentMethod } from "../models/Order";
import { Review } from "../models/Review";
import { Product } from "../models/Product";
import { PromoCode } from "../models/PromoCode";
import { SharedCart } from "../models/SharedCart";
import { User } from "../models/User";
import { STORE_CITY } from "../utils/store";
import { AuthRequest } from "../middleware/auth";
import {
  isBkashConfigured,
  createBkashPayment,
  executeBkashPayment,
  queryBkashPayment,
} from "../integrations/bkash";
import {
  isPathaoConfigured,
  getPathaoCities,
  getPathaoZones,
  getPathaoAreas,
  createPathaoOrder,
  getPathaoOrderStatus,
} from "../integrations/pathao";

interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

interface ShippingInput {
  fullName?: string;
  phone?: string;
  zila?: string;
  upazila?: string;
  addressLine?: string;
}

const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

// "cod" always works; "bkash" only once BKASH_* env vars are actually set
// (see integrations/bkash.ts) — createOrder 400s on it otherwise, same as
// every other method did before a real gateway existed. adminCreateOrder (a
// manual/phone order the shop owner enters themselves) isn't restricted to
// this list, since the admin may be recording a payment that already
// happened outside the site (e.g. a bKash transfer to the shop's personal
// number) rather than triggering a live charge.
function liveOnlinePaymentMethods(): PaymentMethod[] {
  return isBkashConfigured() ? ["cod", "bkash"] : ["cod"];
}

// Shared by createOrder and adminCreateOrder — the only place order totals
// get computed. Never trusts a price or delivery fee the caller sends, only
// productId + quantity; re-fetches products and re-validates promoCode
// itself. Throws { status, message } on any validation failure so the
// caller can just catch and respond.
export async function computeOrderTotals(
  items: CheckoutItemInput[],
  zila: string,
  promoCode?: string,
  session?: ClientSession
) {
  const isInsideCity = zila.trim() === STORE_CITY;

  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } }).session(
    session ?? null
  );
  const productById = new Map(products.map((p) => [p.id as string, p]));

  const orderItems: { product: string; quantity: number; price: number; name: string }[] = [];
  let itemsTotal = 0;
  let deliveryFee = 0;

  for (const { productId, quantity } of items) {
    if (!productId || !quantity || quantity < 1) {
      throw { status: 400, message: "Invalid item in cart" };
    }
    const product = productById.get(productId);
    if (!product) {
      throw { status: 400, message: "One of the items no longer exists" };
    }
    if (product.stock < quantity) {
      throw { status: 409, message: `Not enough stock for "${product.name}"` };
    }
    orderItems.push({ product: productId, quantity, price: product.price, name: product.name });
    itemsTotal += product.price * quantity;
    deliveryFee += isInsideCity ? product.deliveryFeeInsideCity : product.deliveryFeeOutsideCity;
  }

  let discount = 0;
  let appliedCode: string | undefined;
  if (promoCode) {
    const promo = await PromoCode.findOne({ code: promoCode.trim().toUpperCase() }).session(
      session ?? null
    );
    const isLive = !!promo && promo.isActive && (!promo.expiresAt || promo.expiresAt.getTime() > Date.now());
    if (isLive && promo) {
      if (promo.scope === "all") {
        discount =
          promo.discountType === "percentage"
            ? itemsTotal * (promo.value / 100)
            : Math.min(promo.value, itemsTotal);
        appliedCode = promo.code;
      } else {
        const line = orderItems.find((i) => i.product === promo.product?.toString());
        if (line) {
          const lineTotal = line.price * line.quantity;
          discount =
            promo.discountType === "percentage"
              ? lineTotal * (promo.value / 100)
              : Math.min(promo.value, lineTotal);
          appliedCode = promo.code;
        }
      }
    }
  }

  const totalAmount = Math.max(0, itemsTotal + deliveryFee - discount);

  return { orderItems, itemsTotal, deliveryFee, discount, appliedCode, totalAmount };
}

// Atomically decrements each line's stock, conditioned on there still being
// enough at the moment of the write (not just at the earlier read in
// computeOrderTotals) — this is what actually closes the race: two
// concurrent checkouts for the last unit of a product can both pass the
// read-time check above, but only one of these conditional updates can
// succeed. The caller runs this inside a transaction, so throwing here rolls
// back any earlier lines in the same order that already succeeded — an
// order can never end up half-decremented.
export async function decrementStockAtomically(
  orderItems: { product: string; quantity: number; name: string }[],
  session: ClientSession
) {
  for (const item of orderItems) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { session }
    );
    if (result.modifiedCount === 0) {
      throw { status: 409, message: `"${item.name}" just sold out — please update your cart and try again.` };
    }
  }
}

function readShippingAddress(input?: ShippingInput) {
  const { fullName, phone, zila, upazila, addressLine } = input ?? {};
  if (!fullName?.trim() || !phone?.trim() || !zila?.trim() || !upazila?.trim() || !addressLine?.trim()) {
    throw { status: 400, message: "Full shipping details are required" };
  }
  return {
    fullName: fullName.trim(),
    phone: phone.trim(),
    zila: zila.trim(),
    upazila: upazila.trim(),
    addressLine: addressLine.trim(),
  };
}

// Decrements stock only after every line has been validated, so a bad item
// further down the cart can't leave earlier ones partially deducted) and,
// when checking out via a shared "ask someone else to pay" link, marks that
// link fulfilled so it can't be completed twice.
export const createOrder = async (req: AuthRequest, res: Response) => {
  const { items, shippingAddress, promoCode, sharedCartId, paymentMethod } = req.body as {
    items?: CheckoutItemInput[];
    shippingAddress?: ShippingInput;
    promoCode?: string;
    sharedCartId?: string;
    paymentMethod?: PaymentMethod;
  };

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  const method = paymentMethod ?? "cod";
  if (!liveOnlinePaymentMethods().includes(method)) {
    return res
      .status(400)
      .json({ message: "That payment method isn't available yet — please choose Cash on Delivery." });
  }

  const session = await mongoose.startSession();
  let order: InstanceType<typeof Order> | undefined;
  let address: ReturnType<typeof readShippingAddress> | undefined;
  try {
    await session.withTransaction(async () => {
      address = readShippingAddress(shippingAddress);
      const { orderItems, itemsTotal, deliveryFee, discount, appliedCode, totalAmount } =
        await computeOrderTotals(items, address.zila, promoCode, session);

      await decrementStockAtomically(orderItems, session);

      const [created] = await Order.create(
        [
          {
            user: req.userId,
            items: orderItems,
            itemsTotal,
            deliveryFee,
            promoCode: appliedCode,
            discount,
            totalAmount,
            paymentMethod: method,
            source: "online",
            shippingAddress: address,
            sharedCartId: sharedCartId || undefined,
          },
        ],
        { session }
      );
      order = created;

      if (sharedCartId) {
        await SharedCart.findByIdAndUpdate(
          sharedCartId,
          { fulfilledBy: req.userId, fulfilledOrder: created.id },
          { session }
        );
      }
    });
  } catch (err) {
    const { status, message } = err as { status?: number; message?: string };
    return res.status(status ?? 500).json({ message: message ?? "Failed to place order" });
  } finally {
    await session.endSession();
  }

  if (!order) return res.status(500).json({ message: "Failed to place order" });

  // bKash needs its own payment session started after the order (and its
  // stock decrement) is safely committed — never call out to an external
  // API from inside the Mongo transaction above. If starting it fails, the
  // order already exists with stock already held against it, so roll both
  // back the same way a cancellation would rather than leave an
  // unpayable "pending" order sitting on the customer's account.
  if (method === "bkash") {
    try {
      const { paymentID, bkashURL } = await createBkashPayment({
        amount: order.totalAmount,
        merchantInvoiceNumber: order.id,
        payerReference: address!.phone,
        callbackURL: `${process.env.SERVER_PUBLIC_URL || "http://localhost:5000"}/api/orders/bkash/callback`,
      });
      order.bkashPaymentID = paymentID;
      await order.save();
      return res.status(201).json({ ...order.toObject(), bkashRedirectUrl: bkashURL });
    } catch (err) {
      console.error("bKash create payment failed:", err);
      order.status = "cancelled";
      await order.save();
      await restoreStock(order);
      return res
        .status(502)
        .json({ message: "Couldn't start the bKash payment — please try again or choose Cash on Delivery." });
    }
  }

  res.status(201).json(order);
};

// The admin/coadmin equivalent of createOrder, for a phone or walk-in order
// entered on the customer's behalf — same price/stock authority, just no
// buyer account required. See docs/ARCHITECTURE.md's "Checkout & Orders".
export const adminCreateOrder = async (req: AuthRequest, res: Response) => {
  const { items, shippingAddress, promoCode, paymentMethod } = req.body as {
    items?: CheckoutItemInput[];
    shippingAddress?: ShippingInput;
    promoCode?: string;
    paymentMethod?: PaymentMethod;
  };

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Add at least one item" });
  }

  const method = paymentMethod ?? "cod";
  const validMethods: PaymentMethod[] = ["cod", "bkash"];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ message: "Invalid payment method" });
  }

  const session = await mongoose.startSession();
  let order: InstanceType<typeof Order> | undefined;
  try {
    await session.withTransaction(async () => {
      const address = readShippingAddress(shippingAddress);
      const { orderItems, itemsTotal, deliveryFee, discount, appliedCode, totalAmount } =
        await computeOrderTotals(items, address.zila, promoCode, session);

      await decrementStockAtomically(orderItems, session);

      const [created] = await Order.create(
        [
          {
            items: orderItems,
            itemsTotal,
            deliveryFee,
            promoCode: appliedCode,
            discount,
            totalAmount,
            paymentMethod: method,
            source: "manual" as OrderSource,
            shippingAddress: address,
          },
        ],
        { session }
      );
      order = created;
    });

    res.status(201).json(order);
  } catch (err) {
    const { status, message } = err as { status?: number; message?: string };
    res.status(status ?? 500).json({ message: message ?? "Failed to create order" });
  } finally {
    await session.endSession();
  }
};

// Where bKash redirects the customer's own browser after they finish (or
// cancel, or fail) on bKash's hosted payment page — see createOrder's
// callbackURL. Public (no `protect`): the browser making this request has no
// reason to be carrying our JWT, and bKash itself never calls it
// server-to-server. Looks the order up by the paymentID bKash gave back at
// creation, rather than trusting anything in the redirect beyond that.
export const bkashCallback = async (req: Request, res: Response) => {
  const { paymentID, status } = req.query as { paymentID?: string; status?: string };
  const redirectBase = `${process.env.CLIENT_URL || "http://localhost:3000"}/checkout/bkash-result`;

  const order = paymentID ? await Order.findOne({ bkashPaymentID: paymentID }) : null;
  if (!order) return res.redirect(`${redirectBase}?status=error`);

  const finish = (queryStatus: string) => res.redirect(`${redirectBase}?status=${queryStatus}&order=${order.id}`);

  if (status !== "success") {
    if (order.status === "pending") {
      order.status = "cancelled";
      await order.save();
      await restoreStock(order);
    }
    return finish(status === "cancel" ? "cancelled" : "failed");
  }

  // Already resolved by an earlier hit of this same callback (e.g. the
  // customer reloading the redirect page) — nothing left to do.
  if (order.status !== "pending") {
    return finish(order.status === "cancelled" ? "failed" : "success");
  }

  try {
    let result = await executeBkashPayment(paymentID as string);
    if (result.transactionStatus !== "Completed") {
      // Execute only ever works once per paymentID — a repeat hit lands
      // here with "already been called before" instead of a real result,
      // so ask bKash directly what actually happened.
      result = await queryBkashPayment(paymentID as string);
    }

    if (result.transactionStatus === "Completed") {
      order.status = "paid";
      order.bkashTrxID = result.trxID;
      await order.save();
      return finish("success");
    }

    order.status = "cancelled";
    await order.save();
    await restoreStock(order);
    return finish("failed");
  } catch (err) {
    console.error("bKash execute/query failed:", err);
    return finish("error");
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .populate("items.product", "name images deliveryFeeInsideCity deliveryFeeOutsideCity");
  res.json(orders);
};

// Delivered orders' products the current user hasn't reviewed yet — feeds
// the dashboard's "leave a review" prompt.
export const getReviewableProducts = async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ user: req.userId, status: "delivered" }).populate(
    "items.product",
    "name images"
  );

  const seen = new Set<string>();
  const candidates: { _id: string; name: string; images: string[] }[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      const product = item.product as unknown as {
        _id: { toString(): string };
        name: string;
        images: string[];
      } | null;
      if (!product) continue;
      const id = product._id.toString();
      if (seen.has(id)) continue;
      seen.add(id);
      candidates.push({ _id: id, name: product.name, images: product.images });
    }
  }

  if (candidates.length === 0) return res.json([]);

  const reviewed = await Review.find({
    user: req.userId,
    product: { $in: candidates.map((c) => c._id) },
  }).select("product");
  const reviewedIds = new Set(reviewed.map((r) => r.product.toString()));

  res.json(candidates.filter((c) => !reviewedIds.has(c._id)));
};

// Only the order's own buyer, or an admin/coadmin with orders:manage, may
// look up a single order this way — otherwise any signed-in user could read
// anyone else's order (and shipping address) just by guessing/finding an id.
export const getOrderById = async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id)
    .populate("items.product", "name images deliveryFeeInsideCity deliveryFeeOutsideCity")
    .populate("user", "name email");
  if (!order) return res.status(404).json({ message: "Order not found" });

  const orderUser = order.user as unknown as { _id: { toString(): string } } | undefined;
  const isOwner = !!orderUser && orderUser._id.toString() === req.userId;
  if (!isOwner) {
    const requester = await User.findById(req.userId).select("role permissions");
    const canManage =
      !!requester && (requester.role === "admin" || requester.permissions.includes("orders:manage"));
    if (!canManage) return res.status(403).json({ message: "Not authorized to view this order" });
  }

  res.json(order);
};

export const getAllOrders = async (_req: AuthRequest, res: Response) => {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate("items.product", "name images deliveryFeeInsideCity deliveryFeeOutsideCity")
    .populate("user", "name email");
  const withFormattedDate = orders.map((order) => ({
    ...order.toObject(),
    createdAtFormatted: format(order.createdAt, "PPP p"),
  }));
  res.json(withFormattedDate);
};

// Puts a cancelled order's items back into stock — used whenever an order
// transitions INTO "cancelled" (whether the customer cancelled it themselves
// or an admin did), never on any other status change. Only called once per
// order (callers check the previous status wasn't already "cancelled"), so a
// repeat PATCH to "cancelled" can't double-restore the same stock.
async function restoreStock(order: InstanceType<typeof Order>) {
  await Promise.all(
    order.items.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
    )
  );
}

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!status || !ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const existing = await Order.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Order not found" });
  const wasAlreadyCancelled = existing.status === "cancelled";

  existing.status = status as (typeof ORDER_STATUSES)[number];
  await existing.save();

  if (status === "cancelled" && !wasAlreadyCancelled) {
    await restoreStock(existing);
  }

  const order = await Order.findById(existing.id)
    .populate("items.product", "name images deliveryFeeInsideCity deliveryFeeOutsideCity")
    .populate("user", "name email");
  res.json(order);
};

// Self-service cancellation — only the order's own buyer, and only while it's
// still "pending" (hasn't started shipping yet, so there's nothing physically
// in transit to stop). Restores stock the same way an admin cancellation
// does; see restoreStock above.
export const cancelMyOrder = async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.user?.toString() !== req.userId) {
    return res.status(403).json({ message: "Not authorized to cancel this order" });
  }
  if (order.status !== "pending") {
    return res.status(400).json({ message: "This order can no longer be cancelled" });
  }

  order.status = "cancelled";
  await order.save();
  await restoreStock(order);

  const updated = await Order.findById(order.id).populate(
    "items.product",
    "name images deliveryFeeInsideCity deliveryFeeOutsideCity"
  );
  res.json(updated);
};

// Lightweight, quick-glance numbers for the admin dashboard overview — not
// the full analytics payload (that needs analytics:manage; this only needs
// orders:manage, so an orders-only coadmin still gets a useful home screen).
// Revenue mirrors analyticsController's own definition: orders that actually
// represent money owed/received, not just any order ever placed.
export const getOrderStats = async (_req: AuthRequest, res: Response) => {
  const [pendingCount, totalOrders, revenueAgg] = await Promise.all([
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: { $in: ["paid", "shipped", "delivered"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  res.json({
    pendingCount,
    totalOrders,
    totalRevenue: revenueAgg[0]?.total ?? 0,
  });
};

async function populatedOrder(id: string) {
  return Order.findById(id)
    .populate("items.product", "name images deliveryFeeInsideCity deliveryFeeOutsideCity")
    .populate("user", "name email");
}

// Admin-only free-text note, never shown to the customer — see Order.ts's
// internalNote field.
export const updateOrderNote = async (req: AuthRequest, res: Response) => {
  const { note } = req.body as { note?: string };
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.internalNote = note?.trim() || undefined;
  await order.save();
  res.json(await populatedOrder(order.id));
};

// Manual courier entry — works regardless of whether integrations/pathao.ts
// is configured, since the admin may have booked the pickup by hand (e.g.
// on Pathao's own merchant site) rather than through this site's "Book with
// Pathao" button. Clearing every field drops courierProvider too, so an
// order can go back to "no courier yet".
export const updateCourierInfo = async (req: AuthRequest, res: Response) => {
  const { consignmentId, trackingStatus, note } = req.body as {
    consignmentId?: string;
    trackingStatus?: string;
    note?: string;
  };
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const hasAny = !!(consignmentId?.trim() || trackingStatus?.trim() || note?.trim());
  order.courierProvider = hasAny ? "pathao" : undefined;
  order.courierConsignmentId = consignmentId?.trim() || undefined;
  order.courierTrackingStatus = trackingStatus?.trim() || undefined;
  order.courierNote = note?.trim() || undefined;
  await order.save();
  res.json(await populatedOrder(order.id));
};

export const listPathaoCities = async (_req: AuthRequest, res: Response) => {
  if (!isPathaoConfigured()) {
    return res.status(400).json({ message: "Pathao isn't connected yet — see server/.env.example's PATHAO_* vars." });
  }
  try {
    res.json(await getPathaoCities());
  } catch (err) {
    console.error("Pathao city list failed:", err);
    res.status(502).json({ message: (err as Error).message || "Couldn't load Pathao's city list" });
  }
};

export const listPathaoZones = async (req: AuthRequest, res: Response) => {
  if (!isPathaoConfigured()) {
    return res.status(400).json({ message: "Pathao isn't connected yet." });
  }
  try {
    res.json(await getPathaoZones(Number(req.params.cityId)));
  } catch (err) {
    console.error("Pathao zone list failed:", err);
    res.status(502).json({ message: (err as Error).message || "Couldn't load Pathao's zone list" });
  }
};

export const listPathaoAreas = async (req: AuthRequest, res: Response) => {
  if (!isPathaoConfigured()) {
    return res.status(400).json({ message: "Pathao isn't connected yet." });
  }
  try {
    res.json(await getPathaoAreas(Number(req.params.zoneId)));
  } catch (err) {
    console.error("Pathao area list failed:", err);
    res.status(502).json({ message: (err as Error).message || "Couldn't load Pathao's area list" });
  }
};

// Books a real Pathao pickup for this order — only reachable once
// PATHAO_* env vars are set (see integrations/pathao.ts). The admin picks
// city/zone/area from Pathao's own location lists (fetched via the
// listPathao* endpoints above) since our zila/upazila strings don't map
// onto Pathao's location IDs. amount_to_collect is the order total for Cash
// on Delivery, 0 for anything already paid online.
export const bookPathaoOrder = async (req: AuthRequest, res: Response) => {
  if (!isPathaoConfigured()) {
    return res.status(400).json({
      message: "Pathao isn't connected yet — add PATHAO_* environment variables, or enter courier details manually.",
    });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.courierConsignmentId) {
    return res.status(400).json({ message: "This order already has a courier booking" });
  }

  const { cityId, zoneId, areaId, weightKg, description, specialInstruction } = req.body as {
    cityId?: number;
    zoneId?: number;
    areaId?: number;
    weightKg?: number;
    description?: string;
    specialInstruction?: string;
  };
  if (!cityId || !zoneId || !weightKg) {
    return res.status(400).json({ message: "City, zone and item weight are required" });
  }

  try {
    const amountToCollect = order.paymentMethod === "cod" ? order.totalAmount : 0;
    const result = await createPathaoOrder({
      merchantOrderId: order.id,
      recipientName: order.shippingAddress.fullName,
      recipientPhone: order.shippingAddress.phone,
      recipientAddress: order.shippingAddress.addressLine,
      recipientCityId: cityId,
      recipientZoneId: zoneId,
      recipientAreaId: areaId,
      itemWeightKg: weightKg,
      itemQuantity: order.items.reduce((n, item) => n + item.quantity, 0),
      itemDescription: description,
      specialInstruction,
      amountToCollect,
    });

    order.courierProvider = "pathao";
    order.courierConsignmentId = result.consignmentId;
    order.courierTrackingStatus = result.orderStatus;
    order.courierBookedAt = new Date();
    await order.save();
    res.json(await populatedOrder(order.id));
  } catch (err) {
    console.error("Pathao order creation failed:", err);
    res.status(502).json({
      message: (err as Error).message || "Couldn't book this order with Pathao — you can still enter it manually.",
    });
  }
};

export const refreshPathaoStatus = async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!order.courierConsignmentId) {
    return res.status(400).json({ message: "This order has no courier booking yet" });
  }
  if (!isPathaoConfigured()) {
    return res.status(400).json({ message: "Pathao isn't connected yet." });
  }

  try {
    const { orderStatus } = await getPathaoOrderStatus(order.courierConsignmentId);
    order.courierTrackingStatus = orderStatus;
    await order.save();
    res.json(await populatedOrder(order.id));
  } catch (err) {
    console.error("Pathao status refresh failed:", err);
    res.status(502).json({ message: (err as Error).message || "Couldn't refresh this order's Pathao status" });
  }
};

// Applies one status to several orders at once — e.g. marking a batch
// "shipped" after handing them all to a courier in one trip. Reuses
// updateOrderStatus's per-order cancel/restock rule rather than a single
// updateMany, since restoring stock on cancel needs each order's own
// previous status checked individually.
export const bulkUpdateStatus = async (req: AuthRequest, res: Response) => {
  const { ids, status } = req.body as { ids?: string[]; status?: string };
  if (!ids || ids.length === 0) {
    return res.status(400).json({ message: "No orders selected" });
  }
  if (!status || !ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const orders = await Order.find({ _id: { $in: ids } });
  for (const order of orders) {
    const wasAlreadyCancelled = order.status === "cancelled";
    order.status = status as (typeof ORDER_STATUSES)[number];
    await order.save();
    if (status === "cancelled" && !wasAlreadyCancelled) {
      await restoreStock(order);
    }
  }

  const updated = await Order.find({ _id: { $in: ids } })
    .populate("items.product", "name images deliveryFeeInsideCity deliveryFeeOutsideCity")
    .populate("user", "name email");
  res.json(updated);
};
