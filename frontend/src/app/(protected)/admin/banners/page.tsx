import type { Metadata } from "next";
import { AdminBannersView } from "@/views/AdminBannersView";

export const metadata: Metadata = {
  title: "Manage Banners",
  robots: { index: false, follow: false },
};

export default function AdminBannersPage() {
  return <AdminBannersView />;
}
