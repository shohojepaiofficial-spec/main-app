import { api } from "@/lib/api";
import { SiteEmailRouting, SiteSettings, SiteSocialLinks } from "@/models";
import { FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_NUMBER } from "@/lib/contact";

// Used by the public layout/pages and the WhatsApp chat button. Fails soft
// (the hardcoded defaults in lib/contact.ts) so a backend hiccup never
// breaks a page, and an admin who hasn't touched Site Settings yet still
// sees today's real links rather than blanks.
export const getSocialLinks = async (): Promise<SiteSocialLinks> => {
  try {
    const { data } = await api.get<{ social: Partial<SiteSocialLinks> }>("/settings");
    return {
      facebookUrl: data.social.facebookUrl || FACEBOOK_URL,
      instagramUrl: data.social.instagramUrl || INSTAGRAM_URL,
      whatsappNumber: data.social.whatsappNumber || WHATSAPP_NUMBER,
    };
  } catch {
    return { facebookUrl: FACEBOOK_URL, instagramUrl: INSTAGRAM_URL, whatsappNumber: WHATSAPP_NUMBER };
  }
};

// Full admin only, from here down.
export const getAdminSiteSettings = async (): Promise<SiteSettings> => {
  const { data } = await api.get<SiteSettings>("/settings/admin");
  return data;
};

export interface SiteSettingsInput {
  social: SiteSocialLinks;
  emailRouting: SiteEmailRouting;
}

export const updateSiteSettings = async (input: SiteSettingsInput): Promise<SiteSettings> => {
  const { data } = await api.put<SiteSettings>("/settings", input);
  return data;
};
