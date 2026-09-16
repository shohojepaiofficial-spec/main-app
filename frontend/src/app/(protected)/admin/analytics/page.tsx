import type { Metadata } from "next";
import { AdminAnalyticsView } from "@/views/AdminAnalyticsView";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsView />;
}
