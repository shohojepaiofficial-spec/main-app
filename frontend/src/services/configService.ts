import { api } from "@/lib/api";

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
