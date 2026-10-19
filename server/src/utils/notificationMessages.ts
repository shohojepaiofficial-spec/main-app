import type { IOrder } from "../models/Order";
import type { OrderEmailEvent } from "./orderStatusEmail";
import type { NotificationInput } from "./notify";

// Pure text builders for every notification, kept apart from delivery so
// they're easy to test and to reword. Like the emails and SMS, they never
// name the courier.
const orderNumber = (id: string) => `#${id.slice(-6).toUpperCase()}`;
const money = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;

export function orderStatusNotification(
  event: OrderEmailEvent,
  order: { id: string; paymentMethod: IOrder["paymentMethod"]; totalAmount: number; paymentReceived?: boolean; previousStatus?: IOrder["status"] }
): NotificationInput {
  const number = orderNumber(order.id);
  const cod = order.paymentMethod === "cod";
  const [title, body] = (() => {
    switch (event) {
      case "placed":
        return [`Order ${number} received`, cod ? `Pay ${money(order.totalAmount)} cash on delivery. We'll confirm it soon.` : "We'll confirm it once your payment arrives."];
      case "paid":
        return [`Order ${number} confirmed`, cod ? "Your order is being prepared." : `Payment of ${money(order.totalAmount)} received.`];
      case "shipped":
        return [`Order ${number} is on its way`, cod ? `Please keep ${money(order.totalAmount)} ready.` : "It's on its way to you."];
      case "delivered":
        return [`Order ${number} delivered`, "Thank you for shopping with us!"];
      case "cancelled":
        if (!cod && order.previousStatus === "pending" && !order.paymentReceived) {
          return [`Order ${number} cancelled`, "No payment was received."];
        }
        return [`Order ${number} cancelled`, order.paymentReceived ? "We'll contact you about your refund." : "Your order was cancelled."];
    }
  })();
  return { type: "order_status", title, body, link: `/orders/${order.id}` };
}

export type ReturnNotificationEvent = "approved" | "rejected" | "received" | "completed" | "refunded";

export function returnUpdateNotification(event: ReturnNotificationEvent, orderId: string, kind: "return" | "exchange" = "return"): NotificationInput {
  const number = orderNumber(orderId);
  const label = kind === "exchange" ? "exchange" : "return";
  const text: Record<ReturnNotificationEvent, [string, string]> = {
    approved: [`Your ${label} was approved`, `Order ${number}: we'll arrange the pickup.`],
    rejected: [`Your ${label} request was declined`, `Order ${number}: see the details on your order.`],
    received: [`We received your ${label}`, `Order ${number}: the items reached us.`],
    completed: [`Your ${label} is complete`, `Order ${number}: all done.`],
    refunded: ["Your refund was sent", `Order ${number}: your refund has been recorded.`],
  };
  const [title, body] = text[event];
  return { type: "return_update", title, body, link: `/orders/${orderId}` };
}

export function reviewReplyNotification(productId: string, productName: string): NotificationInput {
  return {
    type: "review_reply",
    title: "We replied to your review",
    body: `See our reply on ${productName}.`,
    link: `/shop/${productId}`,
  };
}

export function staffNewOrderNotification(order: { id: string; totalAmount: number; paymentMethod: IOrder["paymentMethod"]; customerName?: string }): NotificationInput {
  const who = order.customerName ? ` from ${order.customerName}` : "";
  return {
    type: "staff_new_order",
    title: `New order ${orderNumber(order.id)}`,
    body: `${money(order.totalAmount)} (${order.paymentMethod === "cod" ? "Cash on Delivery" : "bKash"})${who}`,
    link: "/admin/orders",
  };
}

export function staffPaymentReviewNotification(orderId: string, reason: string): NotificationInput {
  return {
    type: "staff_payment_review",
    title: `Payment needs review: ${orderNumber(orderId)}`,
    body: reason,
    link: "/admin/payments",
  };
}

export function staffReturnRequestNotification(orderId: string, customerName?: string): NotificationInput {
  return {
    type: "staff_return_request",
    title: `New return request for ${orderNumber(orderId)}`,
    body: customerName ? `From ${customerName}.` : "A customer asked to return items.",
    link: "/admin/returns",
  };
}

export function staffLowStockNotification(rows: string[]): NotificationInput {
  const shown = rows.slice(0, 3).join(", ");
  const more = rows.length > 3 ? ` and ${rows.length - 3} more` : "";
  return {
    type: "staff_low_stock",
    title: rows.length === 1 ? "Low stock" : `${rows.length} items low on stock`,
    body: `${shown}${more}`,
    link: "/admin/products",
  };
}

export function staffContactMessageNotification(name: string, subject: string): NotificationInput {
  return {
    type: "staff_contact_message",
    title: `New message from ${name}`,
    body: subject,
    link: "/admin/messages",
  };
}
