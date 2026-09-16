import type { Metadata } from "next";
import { AdminOrdersView } from "@/views/AdminOrdersView";

export const metadata: Metadata = {
  title: "Manage Orders",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  return <AdminOrdersView />;
}
