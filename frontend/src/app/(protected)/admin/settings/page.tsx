import type { Metadata } from "next";
import { AdminSiteSettingsView } from "@/views/AdminSiteSettingsView";

export const metadata: Metadata = {
  title: "Site Settings",
  robots: { index: false, follow: false },
};

export default function AdminSiteSettingsPage() {
  return <AdminSiteSettingsView />;
}
