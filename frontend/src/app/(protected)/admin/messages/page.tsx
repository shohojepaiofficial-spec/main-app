import type { Metadata } from "next";
import { AdminMessagesView } from "@/views/AdminMessagesView";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export default function AdminMessagesPage() {
  return <AdminMessagesView />;
}
