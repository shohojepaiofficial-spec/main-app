import { Response } from "express";
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

// Only "cod" is processed automatically for a customer's own checkout — see
// createOrder. adminCreateOrder (a manual/phone order the shop owner enters
// themselves) isn't restricted to this list, since the admin may be
// recording a payment that already happened outside the site (e.g. a bKash
// transfer to the shop's personal number).
const LIVE_PAYMENT_METHODS: PaymentMethod[] = ["cod"];

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
  if (!LIVE_PAYMENT_METHODS.includes(method)) {
    return res
      .status(400)
      .json({ message: "That payment method isn't available yet — please choose Cash on Delivery." });
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

    res.status(201).json(order);
  } catch (err) {
    const { status, message } = err as { status?: number; message?: string };
    res.status(status ?? 500).json({ message: message ?? "Failed to place order" });
  } finally {
    await session.endSession();
  }
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
  const validMethods: PaymentMethod[] = ["cod", "bkash", "nagad", "card"];
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
