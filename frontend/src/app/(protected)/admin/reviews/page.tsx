import type { Metadata } from "next";
import { AdminReviewsView } from "@/views/AdminReviewsView";

export const metadata: Metadata = {
  title: "Reviews",
  robots: { index: false, follow: false },
};

export default function AdminReviewsPage() {
  return <AdminReviewsView />;
}
