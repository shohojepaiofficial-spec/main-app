import type { Metadata } from "next";
import { AdminTranslationsView } from "@/views/AdminTranslationsView";

export const metadata: Metadata = {
  title: "Translations",
  robots: { index: false, follow: false },
};

export default function AdminTranslationsPage() {
  return <AdminTranslationsView />;
}
