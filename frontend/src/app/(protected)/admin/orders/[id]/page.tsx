import type { Metadata } from "next";
import { AdminOrderDetailView } from "@/views/AdminOrderDetailView";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminOrderDetailView orderId={id} />;
}
