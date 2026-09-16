import type { Metadata } from "next";
import { AdminUsersView } from "@/views/AdminUsersView";

export const metadata: Metadata = {
  title: "Manage Users",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
