import { api } from "@/lib/api";
import { OrderLineInput, SharedCart, ShippingDetailsInput } from "@/models";

// The asker picks where it goes; whoever opens the link only pays. Returns
// the signed link that goes after /pay/ — it is the only key to the cart.
export const createSharedCart = async (input: {
  items: OrderLineInput[];
  shippingAddress: ShippingDetailsInput;
  promoCode?: string;
}): Promise<string> => {
  const { data } = await api.post<{ link: string }>("/shared-carts", input);
  return data.link;
};

export const getSharedCart = async (link: string): Promise<SharedCart | null> => {
  try {
    const { data } = await api.get<SharedCart>(`/shared-carts/${encodeURIComponent(link)}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
};

// No account needed: starts the bKash payment and returns where to send the
// browser.
export const payForSharedCart = async (link: string): Promise<string> => {
  const { data } = await api.post<{ bkashRedirectUrl: string }>(`/shared-carts/${encodeURIComponent(link)}/pay`, {});
  return data.bkashRedirectUrl;
};
