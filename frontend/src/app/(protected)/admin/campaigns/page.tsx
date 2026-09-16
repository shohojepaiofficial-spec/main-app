import type { Metadata } from "next";
import { AdminCampaignsView } from "@/views/AdminCampaignsView";

export const metadata: Metadata = {
  title: "Marketing Campaigns",
  robots: { index: false, follow: false },
};

export default function AdminCampaignsPage() {
  return <AdminCampaignsView />;
}
