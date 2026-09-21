import type { Metadata } from "next";
import { DashboardHome } from "@/views/DashboardHome";
import { getStoreCity } from "@/services/configService";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const storeCity = await getStoreCity();
  return <DashboardHome storeCity={storeCity} />;
}
