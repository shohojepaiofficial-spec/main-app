import type { Metadata } from "next";
import { AdminAdsView } from "@/views/AdminAdsView";

export const metadata: Metadata = {
  title: "Social Media Ads",
  robots: { index: false, follow: false },
};

export default function AdminAdsPage() {
  return <AdminAdsView />;
}
