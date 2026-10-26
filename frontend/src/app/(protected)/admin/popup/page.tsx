import type { Metadata } from "next";
import { AdminPopupView } from "@/views/AdminPopupView";

export const metadata: Metadata = {
  title: "Site Popup",
  robots: { index: false, follow: false },
};

export default function AdminPopupPage() {
  return <AdminPopupView />;
}
