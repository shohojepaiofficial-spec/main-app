import type { Metadata } from "next";
import { AdminPromotionsView } from "@/views/AdminPromotionsView";

export const metadata: Metadata = {
  title: "Promo Codes",
  robots: { index: false, follow: false },
};

export default function AdminPromotionsPage() {
  return <AdminPromotionsView />;
}
