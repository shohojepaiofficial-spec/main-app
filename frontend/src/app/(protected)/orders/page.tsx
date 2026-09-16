import type { Metadata } from "next";
import { OrdersView } from "@/views/OrdersView";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersView />;
}
