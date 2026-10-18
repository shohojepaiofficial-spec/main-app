import { Order, IOrder } from "../models/Order";
import { isSmsConfigured, sendSms } from "../integrations/sms";
import type { OrderEmailEvent } from "./orderStatusEmail";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

export interface OrderSmsData {
  orderId: string;
  paymentMethod: IOrder["paymentMethod"];
  totalAmount: number;
  previousStatus?: IOrder["status"];
  paymentReceived?: boolean;
}

const orderNumber = (id: string) => `#${id.slice(-6).toUpperCase()}`;
// "Tk", not "৳": one non-GSM character switches the whole SMS to Unicode,
// which cuts it from 160 to 70 characters and roughly doubles the cost.
const money = (amount: number) => `Tk ${amount.toLocaleString("en-US")}`;

// Short, plain-English order texts — each must stay within one 160-character
// SMS. Like the emails, they never name the courier.
export function buildOrderStatusSms(event: OrderEmailEvent, data: OrderSmsData): string {
  const number = orderNumber(data.orderId);
  const cod = data.paymentMethod === "cod";
  const brand = process.env.SMS_BRAND_NAME?.trim();
  const body = (() => {
    switch (event) {
      case "placed":
        return cod
          ? `Order ${number} received. Pay ${money(data.totalAmount)} cash on delivery. We'll confirm it soon.`
          : `Order ${number} received. We'll confirm it once your payment arrives.`;
      case "paid":
        return cod
          ? `Order ${number} is confirmed and being prepared.`
          : `Payment of ${money(data.totalAmount)} received. Order ${number} is confirmed.`;
      case "shipped":
        return cod
          ? `Order ${number} is on its way. Please keep ${money(data.totalAmount)} ready.`
          : `Order ${number} is on its way.`;
      case "delivered":
        return `Order ${number} delivered. Thank you for shopping with us!`;
      case "cancelled":
        if (!cod && data.previousStatus === "pending" && !data.paymentReceived) {
          return `Order ${number} was cancelled as no payment was received.`;
        }
        return data.paymentReceived
          ? `Order ${number} was cancelled. We'll contact you about your refund.`
          : `Order ${number} was cancelled.`;
    }
  })();
  return `${brand ? `${brand}: ` : ""}${body} ${CLIENT_URL}/orders`;
}

// Texts the order's shipping phone — so staff-entered phone orders with no
// account are covered too. Fire-and-forget, same rule as the emails: an SMS
// failure must never fail or undo the order change that triggered it.
export function notifyOrderStatusSms(orderId: string, event: OrderEmailEvent, previousStatus?: IOrder["status"]) {
  if (!isSmsConfigured()) return;
  Promise.resolve()
    .then(() => sendOrderStatusSms(orderId, event, previousStatus))
    .catch((err) => console.error("Order status SMS failed:", (err as Error).message));
}

async function sendOrderStatusSms(orderId: string, event: OrderEmailEvent, previousStatus?: IOrder["status"]) {
  const order = await Order.findById(orderId).select("shippingAddress.phone paymentMethod totalAmount bkashTrxID");
  const phone = order?.shippingAddress?.phone;
  if (!order || !phone) return;
  const message = buildOrderStatusSms(event, {
    orderId: order.id,
    paymentMethod: order.paymentMethod,
    totalAmount: order.totalAmount,
    previousStatus,
    paymentReceived: !!order.bkashTrxID,
  });
  await sendSms(phone, message);
}
