import { api, toUploadUrl } from "@/lib/api";
import { SitePopupContent, SitePopupSettings } from "@/models";

// Used by the public layout. Fails soft (no popup) so a backend hiccup never
// breaks a page. The image comes back absolute so it loads from the API origin.
export const getPublicPopup = async (): Promise<SitePopupContent | null> => {
  try {
    const { data } = await api.get<SitePopupContent | null>("/popup");
    return data ? { ...data, image: data.image ? toUploadUrl(data.image) : undefined } : null;
  } catch {
    return null;
  }
};

export const getPopupSettings = async (): Promise<SitePopupSettings> => {
  const { data } = await api.get<SitePopupSettings>("/popup/settings");
  return data;
};

export interface PopupInput {
  isActive: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  buttonHref: string;
  removeImage: boolean;
}

export const updatePopup = async (input: PopupInput, image?: File): Promise<SitePopupSettings> => {
  const formData = new FormData();
  formData.append("isActive", String(input.isActive));
  formData.append("title", input.title);
  formData.append("message", input.message);
  formData.append("buttonLabel", input.buttonLabel);
  formData.append("buttonHref", input.buttonHref);
  formData.append("removeImage", String(input.removeImage));
  if (image) formData.append("image", image);
  const { data } = await api.put<SitePopupSettings>("/popup", formData);
  return data;
};
