import { validateControllerInput } from "../middleware/controllerInput";
import { Response, Request } from "express";
import { SharedCart } from "../models/SharedCart";
import { Product } from "../models/Product";
import { Types } from "mongoose";
import { AuthRequest } from "../middleware/auth";
import { isNonEmptyString } from "../utils/validate";
import { resolvePurchasable } from "../utils/productVariants";
import { cartItems, checkoutSchema, parseInput } from "../utils/checkoutValidation";
import mongoose from "mongoose";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { isBkashLive, createBkashPayment } from "../integrations/bkash";
import { alertLowStockAfterSale } from "../utils/lowStockAlert";
import { transitionOrder } from "../utils/orderTransitions";
import { orderStockMovements, recordStockMovements } from "../utils/stockLedger";
import { cartIdFromPaymentLink, paymentLink } from "../utils/paymentLinks";
import { CHECKOUT_DAILY_LIMIT } from "../middleware/rateLimit";
import { claimPromoUse } from "../utils/promoUsage";
import {
  computeOrderTotals, decrementStockAtomically, orderFieldsFromTotals, resolveShippingAddress, pathaoIds, MAX_OPEN_ORDERS,
} from "./orderController";
interface CartItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

// Protected — only a signed-in customer can start an "ask someone else to
// pay" link. They choose where it goes and the order will be theirs (their
// My Orders, their emails), so checkout's verified-email rule applies.
export const createSharedCart = async (req: AuthRequest, res: Response) => {
  validateControllerInput("createSharedCart", req);
  const items = parseInput(cartItems, req.body?.items);
  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }
  const address = await resolveShippingAddress(parseInput(checkoutSchema.shape.shippingAddress, req.body?.shippingAddress));
  const asker = await User.findById(req.userId).select("isEmailVerified");
  if (!asker?.isEmailVerified) {
    return res.status(403).json({
      code: "EMAIL_VERIFICATION_REQUIRED",
      message: "Verify your email before creating a payment link. You can resend the verification email from Settings.",
    });
  }
  const promoCode = typeof req.body?.promoCode === "string" && req.body.promoCode.trim() ? req.body.promoCode.trim() : undefined;

  const sharedCart = await SharedCart.create({
    shippingAddress: address,
    promoCode,
    items: items.map((i) => ({
      product: i.productId,
      variant: isNonEmptyString(i.variantId) && Types.ObjectId.isValid(i.variantId) ? i.variantId : undefined,
      quantity: i.quantity,
    })),
    createdBy: req.userId,
  });

  // The signed link, never the bare id: anyone holding it can see and pay.
  res.status(201).json({ link: paymentLink(sharedCart.id) });
};

const LINK_NOT_VALID = { message: "This link is no longer valid" };

// Public — whoever receives the link sees what's being asked of them
// before deciding to pay. An unsigned or forged link is the same 404 as an
// expired one.
export const getSharedCart = async (req: Request, res: Response) => {
  validateControllerInput("getSharedCart", req);
  const cartId = cartIdFromPaymentLink(req.params.link);
  if (!cartId) return res.status(404).json(LINK_NOT_VALID);
  const sharedCart = await SharedCart.findById(cartId).populate("createdBy", "name");
  if (!sharedCart || !sharedCart.expiresAt || sharedCart.expiresAt <= new Date()) return res.status(404).json(LINK_NOT_VALID);

  const productIds = sharedCart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productById = new Map(products.map((p) => [p.id as string, p]));

  const items = sharedCart.items
    .map((item) => {
      const product = productById.get(item.product.toString());
      if (!product) return null;
      // A variant deleted (or a product that gained options) since the link
      // was made has no well-defined price any more — drop the line, same
      // as a deleted product, rather than show a price checkout would reject.
      let line;
      try {
        line = resolvePurchasable(product, item.variant?.toString());
      } catch {
        return null;
      }
      return {
        productId: product.id as string,
        variantId: line.variant?._id.toString(),
        variantLabel: line.variant?.label,
        name: product.name,
        image: line.variant?.image ?? product.images[0],
        price: line.price,
        quantity: item.quantity,
        deliveryFeeInsideCity: product.deliveryFeeInsideCity,
        deliveryFeeOutsideCity: product.deliveryFeeOutsideCity,
        // So the payer's checkout can preview the pre-order discount — the
        // order itself still recomputes it from the product.
        preorder: product.preorder?.enabled
          ? {
              shipDate: product.preorder.shipDate,
              codDiscountPercent: product.preorder.codDiscountPercent,
              onlineDiscountPercent: product.preorder.onlineDiscountPercent,
            }
          : undefined,
      };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  const createdBy = sharedCart.createdBy as unknown as { name: string } | null;
  const address = sharedCart.shippingAddress;

  // What the payer will actually be charged (delivery + any discount), from
  // the same computeOrderTotals the order uses. Missing if the cart can no
  // longer be bought (out of stock, deleted product) — the pay call then
  // explains why.
  let totals: { itemsTotal: number; deliveryFee: number; discount: number; totalAmount: number } | undefined;
  if (address && items.length > 0) {
    try {
      const computed = await computeOrderTotals(sharedCartLines(sharedCart), address.zila, address.upazila, sharedCart.promoCode, undefined, "bkash", pathaoIds(address));
      totals = {
        itemsTotal: computed.itemsTotal,
        deliveryFee: computed.deliveryFee,
        discount: computed.discount + computed.preorderDiscount,
        totalAmount: computed.totalAmount,
      };
    } catch {
      totals = undefined;
    }
  }

  res.json({
    link: paymentLink(sharedCart.id),
    items,
    createdByName: createdBy?.name ?? "Someone",
    isFulfilled: !!sharedCart.fulfilledOrder,
    isPaymentPending: !!sharedCart.claimedOrder && !sharedCart.fulfilledOrder,
    // Only the name and area: the link is public, so no phone or street.
    deliverTo: address ? { fullName: address.fullName, area: `${address.upazila}, ${address.zila}` } : null,
    totals: totals ?? null,
    bkashAvailable: isBkashLive(),
  });
};

const sharedCartLines = (cart: InstanceType<typeof SharedCart>) =>
  cart.items.map((i) => ({ productId: i.product.toString(), variantId: i.variant?.toString(), quantity: i.quantity }));

const claimable = (id: Types.ObjectId) => ({ _id: id, expiresAt: { $gt: new Date() }, fulfilledOrder: { $exists: false }, claimedOrder: { $exists: false } });

// Public — whoever opened the link pays with bKash, no account needed. The
// order belongs to the person who asked (createdBy) and goes to the address
// they chose. One order per link at a time: a cancelled or expired bKash
// attempt releases the claim (utils/orderTransitions.ts), so the link can be
// tried again; a retry while one is still open reuses its bKash page.
export const payForSharedCart = async (req: Request, res: Response) => {
  validateControllerInput("payForSharedCart", req);
  const cartId = cartIdFromPaymentLink(req.params.link);
  if (!cartId) return res.status(404).json(LINK_NOT_VALID);
  if (!isBkashLive()) {
    return res.status(503).json({ code: "BKASH_UNAVAILABLE", message: "bKash payment is coming soon." });
  }
  const cart = await SharedCart.findById(cartId);
  if (!cart || cart.expiresAt <= new Date()) return res.status(404).json(LINK_NOT_VALID);
  if (cart.fulfilledOrder) return res.status(409).json({ message: "This has already been paid for." });
  if (!cart.shippingAddress) {
    return res.status(410).json({ message: "This link is out of date. Ask for a new one." });
  }

  if (cart.claimedOrder) {
    const open = await Order.findOne({ _id: cart.claimedOrder, status: "pending", reservationExpiresAt: { $gt: new Date() } });
    if (open?.bkashRedirectUrl) return res.json({ bkashRedirectUrl: open.bkashRedirectUrl });
    return res.status(409).json({ message: "A payment for this link is already in progress. Try again in a few minutes." });
  }

  const openOrders = await Order.countDocuments({ user: cart.createdBy, status: "pending" });
  if (openOrders >= MAX_OPEN_ORDERS) {
    return res.status(429).json({ message: "This order can't be paid right now. Please ask the person who sent the link." });
  }
  // The same daily cap as the asker's own checkouts (checkoutDailyLimiter):
  // otherwise links would let one account hold stock around the clock.
  const ordersToday = await Order.countDocuments({ user: cart.createdBy, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
  if (ordersToday >= CHECKOUT_DAILY_LIMIT) {
    return res.status(429).json({ message: "This order can't be paid today. Please try again tomorrow or ask the person who sent the link." });
  }

  const address = cart.shippingAddress;
  const session = await mongoose.startSession();
  let order: InstanceType<typeof Order> | undefined;
  try {
    await session.withTransaction(async () => {
      const totals = await computeOrderTotals(sharedCartLines(cart), address.zila, address.upazila, cart.promoCode, session, "bkash", pathaoIds(address));
      await claimPromoUse(totals.appliedCode, { user: cart.createdBy, phone: address.phone }, session);
      await decrementStockAtomically(totals.orderItems, session);
      const [created] = await Order.create(
        [
          {
            user: cart.createdBy,
            reservationExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
            ...orderFieldsFromTotals(totals),
            paymentMethod: "bkash",
            source: "online",
            shippingAddress: { ...address },
            sharedCartId: cart._id,
          },
        ],
        { session }
      );
      await recordStockMovements(orderStockMovements(totals.orderItems, "sale", { order: created._id }), session);
      const claimed = await SharedCart.findOneAndUpdate(claimable(cart._id as Types.ObjectId), { $set: { claimedOrder: created._id } }, { session });
      if (!claimed) throw Object.assign(new Error("A payment for this link is already in progress"), { status: 409 });
      order = created;
    });
  } catch (err) {
    const { status, message } = err as { status?: number; message?: string };
    return res.status(status ?? 500).json({ message: message ?? "Couldn't start the payment" });
  } finally {
    await session.endSession();
  }
  if (!order) return res.status(500).json({ message: "Couldn't start the payment" });
  alertLowStockAfterSale(order.items);

  // Outside the transaction, like createOrder: never call bKash while holding it.
  try {
    const { paymentID, bkashURL } = await createBkashPayment({
      amount: order.totalAmount,
      merchantInvoiceNumber: order.id,
      payerReference: address.phone,
      callbackURL: `${process.env.SERVER_PUBLIC_URL || "http://localhost:5000"}/api/orders/bkash/callback`,
    });
    await Order.updateOne({ _id: order._id }, { $set: { bkashPaymentID: paymentID, bkashRedirectUrl: bkashURL } });
    return res.status(201).json({ bkashRedirectUrl: bkashURL });
  } catch (err) {
    console.error("bKash create payment (shared link) failed:", err);
    await transitionOrder(order.id, "cancelled", { pendingOnly: true, silent: true });
    return res.status(502).json({ message: "Couldn't start the bKash payment — please try again." });
  }
};
