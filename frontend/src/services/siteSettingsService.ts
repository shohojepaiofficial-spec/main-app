import { api } from "@/lib/api";
import { SiteContactInfo, SiteEmailRouting, SiteSettings, SiteSocialLinks } from "@/models";
import {
  FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_NUMBER,
  CONTACT_PHONE_DISPLAY, CONTACT_EMAIL, CONTACT_ADDRESS,
} from "@/lib/contact";

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

// Same fallback-to-hardcoded-default convention as getSocialLinks above,
// for the navbar top bar / footer / Contact / About pages' phone, email
// and address.
export const getContactInfo = async (): Promise<SiteContactInfo> => {
  try {
    const { data } = await api.get<{ contact: Partial<SiteContactInfo> }>("/settings");
    return {
      phone: data.contact.phone || CONTACT_PHONE_DISPLAY,
      email: data.contact.email || CONTACT_EMAIL,
      address: data.contact.address || CONTACT_ADDRESS,
    };
  } catch {
    return { phone: CONTACT_PHONE_DISPLAY, email: CONTACT_EMAIL, address: CONTACT_ADDRESS };
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
  contact: SiteContactInfo;
}

export const updateSiteSettings = async (input: SiteSettingsInput): Promise<SiteSettings> => {
  const { data } = await api.put<SiteSettings>("/settings", input);
  return data;
};
