// Real contact details — every place that shows contact info (Navbar,
// Footer, WhatsAppButton, the Contact page) reads from here, so updating
// them is a one-file change.
export const CONTACT_PHONE_DISPLAY = "+880 1700-502013";
export const CONTACT_PHONE_TEL = "+8801700502013";
export const CONTACT_EMAIL = "hello@shohojepai.com";
export const CONTACT_ADDRESS = "55/56 Niloy, Chouhatta, Sylhet";
// Digits only, with country code, no "+" — what wa.me links expect.
export const WHATSAPP_NUMBER = "8801700502013";

// Real social profiles, shared by Navbar/Footer and the homepage's
// Organization JSON-LD `sameAs` — which must only ever list genuine profiles,
// so add a network here only once its page actually exists.
export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61594292297060";
export const INSTAGRAM_URL = "https://www.instagram.com/shohoje.pai/";
export const SOCIAL_PROFILE_URLS = [FACEBOOK_URL, INSTAGRAM_URL];
