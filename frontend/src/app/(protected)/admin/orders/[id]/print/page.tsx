import type { Metadata } from "next";
import { OrderPrintView } from "@/views/OrderPrintView";

export const metadata: Metadata = {
  title: "Print order",
  robots: { index: false, follow: false },
};

export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderPrintView orderId={id} />;
}
