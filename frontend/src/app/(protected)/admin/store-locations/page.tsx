import type { Metadata } from "next";
import { AdminStoreLocationsView } from "@/views/AdminStoreLocationsView";

export const metadata: Metadata = {
  title: "Manage Store Locations",
  robots: { index: false, follow: false },
};

export default function AdminStoreLocationsPage() {
  return <AdminStoreLocationsView />;
}
