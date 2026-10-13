// Real contact details — every place that shows contact info (Navbar,
// Footer, ChatButtons, the Contact page) reads from here, so updating
// them is a one-file change.
export const CONTACT_PHONE_DISPLAY = "+880 1700-502013";
export const CONTACT_PHONE_TEL = "+8801700502013";
export const CONTACT_EMAIL = "hello@shohojepai.com";
// English copy — the storefront shows the Bangla version via the
// "contact.address" translation key (server/src/data/translationSeed.ts).
export const CONTACT_ADDRESS =
  "Rongdhonu Manipuri Saree Ghor, Lamabazar, opposite Madan Mohan College gate, Sylhet";
export const CONTACT_ADDRESS_KEY = "contact.address";
// Namecheap Private Email's webmail sign-in, and the store's mailboxes on
// it — the dashboard sidebar shows staff one link per address. Every
// address signs in on the same page; add a mailbox here once it exists.
export const WEBMAIL_LOGIN_URL = "https://privateemail.com/";
export const STAFF_MAILBOXES = [CONTACT_EMAIL];
// Digits only, with country code, no "+" — what wa.me links expect.
export const WHATSAPP_NUMBER = "8801700502013";

// Real social profiles, shared by Navbar/Footer and the homepage's
// Organization JSON-LD `sameAs` — which must only ever list genuine profiles,
// so add a network here only once its page actually exists.
export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61594292297060";
export const INSTAGRAM_URL = "https://www.instagram.com/shohoje.pai/";
export const SOCIAL_PROFILE_URLS = [FACEBOOK_URL, INSTAGRAM_URL];

// Starts a Messenger chat with the Page (the id is the one in FACEBOOK_URL)
// — what a customer gets from the chat button's Messenger option.
export const MESSENGER_CHAT_URL = "https://m.me/61594292297060";

// The Page's Meta Business Suite inbox (Messenger + Instagram chats) —
// admin/coadmin get this from the Messenger option instead, so they can
// reply.
export const MESSENGER_INBOX_URL = "https://business.facebook.com/latest/inbox/all";
