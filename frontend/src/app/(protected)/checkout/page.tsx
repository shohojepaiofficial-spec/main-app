import type { Metadata } from "next";
import { CheckoutView } from "@/views/CheckoutView";
import { getStoreCity } from "@/services/configService";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const storeCity = await getStoreCity();
  return <CheckoutView storeCity={storeCity} />;
}
