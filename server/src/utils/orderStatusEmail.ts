import { Order, IOrder } from "../models/Order";
import { sendEmail } from "./sendEmail";
import { escapeHtml } from "./escapeHtml";
import { RETURN_WINDOW_DAYS } from "./returns";
import { notifyOrderStatusSms } from "./orderStatusSms";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// "placed" is the order's creation; the rest are the status it moved to.
export type OrderEmailEvent = "placed" | Exclude<IOrder["status"], "pending">;

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  paymentMethod: IOrder["paymentMethod"];
  totalAmount: number;
  items: { name: string; quantity: number; variantLabel?: string }[];
  isPreorder?: boolean;
  expectedShipDate?: Date;
  // The status the order was in before this change (absent for "placed").
  previousStatus?: IOrder["status"];
  // The online payment was actually received (a bKash transaction id exists).
  paymentReceived?: boolean;
}

const orderNumber = (id: string) => `#${id.slice(-6).toUpperCase()}`;
const money = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;
const shipDate = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// Subject + opening lines for each event. Kept free of the courier's name:
// the storefront never shows it to customers either.
function copyFor(event: OrderEmailEvent, data: OrderEmailData): { subject: string; lines: string[] } {
  const number = orderNumber(data.orderId);
  const cod = data.paymentMethod === "cod";
  switch (event) {
    case "placed":
      return {
        subject: `We've received your order ${number}`,
        lines: [
          `Thanks for your order. We've received it and will confirm it shortly.`,
          `You'll pay ${money(data.totalAmount)} in cash when it is delivered.`,
          ...(data.isPreorder
            ? [data.expectedShipDate
              ? `This order includes a pre-order item, so the parcel ships around ${shipDate(data.expectedShipDate)}.`
              : `This order includes a pre-order item, so the parcel ships once that item is in stock.`]
            : []),
        ],
      };
    case "paid":
      return cod
        ? { subject: `Your order ${number} is confirmed`, lines: [`Good news: your order is confirmed and we're getting it ready.`] }
        : { subject: `Payment received for order ${number}`, lines: [`We've received your payment of ${money(data.totalAmount)}. Your order is confirmed and we're getting it ready.`] };
    case "shipped":
      return {
        subject: `Your order ${number} is on its way`,
        lines: [
          `Your order has been handed to the courier and is on its way to you.`,
          ...(cod ? [`Please keep ${money(data.totalAmount)} ready to pay on delivery.`] : []),
        ],
      };
    case "delivered":
      return {
        subject: `Your order ${number} has been delivered`,
        lines: [
          `Your order has been delivered. We hope you like it.`,
          `If something isn't right, you can request a return or exchange from your orders page within ${RETURN_WINDOW_DAYS} days.`,
        ],
      };
    case "cancelled":
      // An online order that never got past "pending" was never paid for.
      if (!cod && data.previousStatus === "pending" && !data.paymentReceived) {
        return {
          subject: `Your order ${number} was cancelled`,
          lines: [
            `We didn't receive a payment for this order, so it has been cancelled.`,
            `If money did leave your account, reply to this email and we'll sort it out.`,
          ],
        };
      }
      return {
        subject: `Your order ${number} was cancelled`,
        lines: [
          `Your order has been cancelled.`,
          ...(data.paymentReceived ? [`We'll be in touch about refunding your payment of ${money(data.totalAmount)}.`] : []),
          `If you didn't expect this, reply to this email and we'll help.`,
        ],
      };
  }
}

export function buildOrderStatusEmail(event: OrderEmailEvent, data: OrderEmailData) {
  const { subject, lines } = copyFor(event, data);
  const link = `${CLIENT_URL}/orders`;
  const itemText = (item: OrderEmailData["items"][number]) =>
    `${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""} × ${item.quantity}`;
  const html = [
    `<p>Hi ${escapeHtml(data.customerName)},</p>`,
    ...lines.map((line) => `<p>${escapeHtml(line)}</p>`),
    `<p><strong>Order ${orderNumber(data.orderId)}</strong></p>`,
    `<ul>${data.items.map((item) => `<li>${escapeHtml(itemText(item))}</li>`).join("")}</ul>`,
    `<p>Total: <strong>${money(data.totalAmount)}</strong></p>`,
    `<p><a href="${link}">See your order and its progress</a></p>`,
  ].join("");
  const text = [
    `Hi ${data.customerName},`, "", ...lines, "",
    `Order ${orderNumber(data.orderId)}`, ...data.items.map((item) => `- ${itemText(item)}`),
    `Total: ${money(data.totalAmount)}`, "", `See your order and its progress:`, link,
  ].join("\n");
  return { subject, html, text };
}

// Emails the customer about their order. Fire-and-forget like every other
// email here: a mail hiccup must never fail or undo the order change that
// triggered it. Orders with no account (staff-entered phone orders) have no
// address to write to and are skipped.
// Also sends the matching SMS (utils/orderStatusSms.ts) when SMS is configured.
export function notifyOrderStatus(orderId: string, event: OrderEmailEvent, previousStatus?: IOrder["status"]) {
  notifyOrderStatusSms(orderId, event, previousStatus);
  Promise.resolve()
    .then(() => sendOrderStatusEmail(orderId, event, previousStatus))
    .catch((err) => console.error("Order status email failed:", (err as Error).message));
}

async function sendOrderStatusEmail(orderId: string, event: OrderEmailEvent, previousStatus?: IOrder["status"]) {
  const order = await Order.findById(orderId)
    .select("user items paymentMethod totalAmount isPreorder expectedShipDate bkashTrxID")
    .populate<{ user?: { name: string; email?: string } | null }>("user", "name email")
    .populate<{ items: { product?: { name?: string } | null; quantity: number; variantLabel?: string }[] }>("items.product", "name");
  if (!order?.user?.email) return;
  const email = buildOrderStatusEmail(event, {
    orderId: order.id,
    customerName: order.user.name,
    paymentMethod: order.paymentMethod,
    totalAmount: order.totalAmount,
    items: order.items.map((item) => ({ name: item.product?.name ?? "Item", quantity: item.quantity, variantLabel: item.variantLabel })),
    isPreorder: order.isPreorder,
    expectedShipDate: order.expectedShipDate,
    previousStatus,
    paymentReceived: !!order.bkashTrxID,
  });
  await sendEmail({ to: order.user.email, ...email });
}
