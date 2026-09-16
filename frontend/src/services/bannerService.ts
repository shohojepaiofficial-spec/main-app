import { api, toUploadUrl } from "@/lib/api";
import { CtaLink, HeroSlide, ManagedBanner } from "@/models";

// Used by the public landing page — always active banners, already in the
// shape HeroSlider expects. Fails soft (empty array) so a backend hiccup
// doesn't take the homepage down with it.
export const getPublicBanners = async (): Promise<HeroSlide[]> => {
  try {
    const { data } = await api.get<HeroSlide[]>("/banners");
    // The API returns `image` as a bare "/uploads/..." path (relative to the
    // backend's own origin). HeroSlider passes it straight to next/image, so
    // it needs to already be an absolute URL — otherwise it resolves against
    // the frontend's origin instead and 404s (a broken-image icon, not the
    // banner).
    return data.map((slide) => ({ ...slide, image: toUploadUrl(slide.image) }));
  } catch {
    return [];
  }
};

export const getAllBanners = async (): Promise<ManagedBanner[]> => {
  const { data } = await api.get<ManagedBanner[]>("/banners/all");
  return data;
};

export interface BannerInput {
  title: string;
  subtitle: string;
  eyebrow: string;
  accentColor: string;
  isActive: boolean;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  promoCodeId?: string;
}

function buildFormData(input: BannerInput, image?: File) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("subtitle", input.subtitle);
  formData.append("eyebrow", input.eyebrow);
  formData.append("accentColor", input.accentColor);
  formData.append("isActive", String(input.isActive));
  formData.append("primaryCta", JSON.stringify(input.primaryCta));
  formData.append("secondaryCta", input.secondaryCta ? JSON.stringify(input.secondaryCta) : "");
  formData.append("promoCodeId", input.promoCodeId ?? "");
  if (image) formData.append("image", image);
  return formData;
}

export const createBanner = async (input: BannerInput, image: File): Promise<ManagedBanner> => {
  const { data } = await api.post<ManagedBanner>("/banners", buildFormData(input, image));
  return data;
};

export const updateBanner = async (
  id: string,
  input: BannerInput,
  image?: File
): Promise<ManagedBanner> => {
  const { data } = await api.put<ManagedBanner>(`/banners/${id}`, buildFormData(input, image));
  return data;
};

export const moveBanner = async (
  id: string,
  direction: "up" | "down"
): Promise<ManagedBanner[]> => {
  const { data } = await api.patch<ManagedBanner[]>(`/banners/${id}/move`, { direction });
  return data;
};

export const deleteBanner = async (id: string): Promise<void> => {
  await api.delete(`/banners/${id}`);
};
