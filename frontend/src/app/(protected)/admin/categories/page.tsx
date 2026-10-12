import type { Metadata } from "next";
import { AdminCategoriesView } from "@/views/AdminCategoriesView";

export const metadata: Metadata = {
  title: "Manage Categories",
  robots: { index: false, follow: false },
};

export default function AdminCategoriesPage() {
  return <AdminCategoriesView />;
}
