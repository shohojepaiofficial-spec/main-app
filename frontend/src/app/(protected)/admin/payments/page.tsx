import type { Metadata } from "next";
import { AdminPaymentsView } from "@/views/AdminPaymentsView";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

export default function AdminPaymentsPage() {
  return <AdminPaymentsView />;
}
