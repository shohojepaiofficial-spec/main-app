import { api } from "@/lib/api";
import { Product } from "@/models";

export const getWishlist = async (): Promise<Product[]> => {
  const { data } = await api.get<Product[]>("/wishlist");
  return data;
};

export const addToWishlist = async (productId: string): Promise<void> => {
  await api.post(`/wishlist/${productId}`);
};

export const removeFromWishlist = async (productId: string): Promise<void> => {
  await api.delete(`/wishlist/${productId}`);
};
