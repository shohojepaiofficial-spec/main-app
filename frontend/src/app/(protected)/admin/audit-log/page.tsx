import type { Metadata } from "next";
import { AdminAuditLogView } from "@/views/AdminAuditLogView";

export const metadata: Metadata = {
  title: "Change History",
  robots: { index: false, follow: false },
};

export default function AdminAuditLogPage() {
  return <AdminAuditLogView />;
}
