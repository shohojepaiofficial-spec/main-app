import { api } from "@/lib/api";
import { GalleryShareView } from "@/models";

// Public — no account needed, same shape as sharedCartService's getSharedCart.
export const getGalleryShare = async (link: string): Promise<GalleryShareView | null> => {
  try {
    const { data } = await api.get<GalleryShareView>(`/gallery-shares/${encodeURIComponent(link)}`);
    return data;
  } catch (err) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
};
