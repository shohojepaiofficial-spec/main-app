import { api } from "@/lib/api";
import { OrderLineInput, SharedCart, ShippingDetails } from "@/models";

// The asker picks where it goes; whoever opens the link only pays.
export const createSharedCart = async (input: {
  items: OrderLineInput[];
  shippingAddress: ShippingDetails;
  promoCode?: string;
}): Promise<string> => {
  const { data } = await api.post<{ id: string }>("/shared-carts", input);
  return data.id;
};

export const getSharedCart = async (id: string): Promise<SharedCart | null> => {
  try {
    const { data } = await api.get<SharedCart>(`/shared-carts/${id}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
};

// No account needed: starts the bKash payment and returns where to send the
// browser.
export const payForSharedCart = async (id: string): Promise<string> => {
  const { data } = await api.post<{ bkashRedirectUrl: string }>(`/shared-carts/${id}/pay`, {});
  return data.bkashRedirectUrl;
};
