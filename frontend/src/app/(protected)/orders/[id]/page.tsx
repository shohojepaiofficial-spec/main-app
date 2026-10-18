import type { Metadata } from "next";
import { MyOrderDetailView } from "@/views/MyOrderDetailView";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function MyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MyOrderDetailView orderId={id} />;
}
