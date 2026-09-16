import { api } from "@/lib/api";
import { SharedCart } from "@/models";

export const createSharedCart = async (
  items: { productId: string; quantity: number }[]
): Promise<string> => {
  const { data } = await api.post<{ id: string }>("/shared-carts", { items });
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
