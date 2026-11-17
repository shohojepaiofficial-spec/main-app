import type { Metadata } from "next";
import { MyOrderDetailView } from "@/views/MyOrderDetailView";
import { getSocialLinks } from "@/services/siteSettingsService";

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

export default async function MyOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, social] = await Promise.all([params, getSocialLinks()]);
  return <MyOrderDetailView orderId={id} whatsappNumber={social.whatsappNumber} />;
}
