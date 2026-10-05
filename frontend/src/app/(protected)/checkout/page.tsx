import type { Metadata } from "next";
import { CheckoutView } from "@/views/CheckoutView";
import { getCheckoutConfig } from "@/services/configService";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

// The config fetch goes through axios, which Next can't track, so without
// this the payment methods would be frozen at build time — turning bKash on
// in Railway wouldn't show up until the next frontend deploy.
export const revalidate = 60;

export default async function CheckoutPage() {
  const { storeCity, paymentMethods } = await getCheckoutConfig();
  return <CheckoutView storeCity={storeCity} paymentMethods={paymentMethods} />;
}
