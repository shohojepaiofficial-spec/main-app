import { api } from "@/lib/api";
import { Ad, AdPlatform, AdSourceType } from "@/models";

export const getAds = async (): Promise<Ad[]> => {
  const { data } = await api.get<Ad[]>("/ads");
  return data;
};

export interface AdInput {
  title: string;
  sourceType: AdSourceType;
  productId?: string;
  // The code, not an id — the promo picker reads from the public
  // "active promos" list, which doesn't expose internal ids.
  promoCode?: string;
  caption: string;
  link?: string;
  platforms: AdPlatform[];
  image?: File | null;
}

export const createAd = async (input: AdInput): Promise<Ad> => {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("sourceType", input.sourceType);
  if (input.productId) formData.append("productId", input.productId);
  if (input.promoCode) formData.append("promoCode", input.promoCode);
  formData.append("caption", input.caption);
  if (input.link) formData.append("link", input.link);
  formData.append("platforms", JSON.stringify(input.platforms));
  if (input.image) formData.append("image", input.image);

  const { data } = await api.post<Ad>("/ads", formData);
  return data;
};

// Re-posts to every one of the ad's platforms, or just `platforms` if given
// (e.g. retrying only the one that previously failed).
export const publishAd = async (id: string, platforms?: AdPlatform[]): Promise<Ad> => {
  const { data } = await api.post<Ad>(`/ads/${id}/publish`, { platforms });
  return data;
};

export const deleteAd = async (id: string): Promise<void> => {
  await api.delete(`/ads/${id}`);
};
