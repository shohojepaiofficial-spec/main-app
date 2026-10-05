import { api } from "@/lib/api";
import { PaymentMethod } from "@/models";

// The server is the one place STORE_CITY is actually defined (see server's
// utils/store.ts) — this fetches it rather than hardcoding a second copy
// here, so the two can never drift out of sync. No soft-fail fallback on
// purpose: a wrong guess here would silently misclassify inside/outside-city
// delivery fees, which is worse than the page failing loudly alongside
// every other essential fetch it's called next to.
export const getStoreCity = async (): Promise<string> => {
  const { data } = await api.get<{ storeCity: string }>("/config");
  return data.storeCity;
};

// Checkout also needs the payment methods the server will actually accept
// (bKash only once real merchant credentials are live) — same endpoint, so
// one request covers both.
export const getCheckoutConfig = async (): Promise<{
  storeCity: string;
  paymentMethods: PaymentMethod[];
}> => {
  const { data } = await api.get<{ storeCity: string; paymentMethods: PaymentMethod[] }>("/config");
  return data;
};
