import type { Metadata } from "next";
import { AdminProductsView } from "@/views/AdminProductsView";

export const metadata: Metadata = {
  title: "Manage Products",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <AdminProductsView />;
}
