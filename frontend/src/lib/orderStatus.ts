// Staff-facing order status wording and colours, shared by Manage Orders
// and the order detail page. The admin panel is English only.
import type { OrderStatus } from "@/models";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// Rendered in this order everywhere a status picker appears — the natural
// pipeline order, with "Cancelled" last since it's the exception, not a step.
export const ORDER_STATUS_OPTIONS: OrderStatus[] = ["pending", "paid", "shipped", "delivered", "cancelled"];

export const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
};
