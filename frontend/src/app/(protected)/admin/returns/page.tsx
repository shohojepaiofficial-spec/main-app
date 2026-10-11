import type { Metadata } from "next";
import { AdminReturnsView } from "@/views/AdminReturnsView";

export const metadata: Metadata = {
  title: "Returns",
  robots: { index: false, follow: false },
};

export default function AdminReturnsPage() {
  return <AdminReturnsView />;
}
