// Source list for `npm run sync-translations` — every translatable string
// on the storefront, grouped by the section it lives in. `key` must match
// exactly what the corresponding <T k="..."> / t("...") call site in the
// frontend uses; `en` should match that call site's own hardcoded fallback
// text (kept here mainly for the admin dashboard's reference column — see
// models/Translation.ts). `bn` is the real initial Bangla translation;
// re-running the sync script never overwrites an existing row's `bn` (an
// admin's later edit from /admin/translations always wins), it only adds
// missing keys and refreshes `en` on existing ones.
export interface TranslationSeedEntry {
  key: string;
  en: string;
  bn: string;
}

export const translationSeed: TranslationSeedEntry[] = [
  // --- Navbar ---
  { key: "nav.home", en: "Home", bn: "হোম" },
  { key: "nav.shop", en: "Shop", bn: "শপ" },
  { key: "nav.categories", en: "Categories", bn: "ক্যাটাগরি" },
  { key: "nav.about", en: "About", bn: "আমাদের সম্পর্কে" },
  { key: "nav.contact", en: "Contact", bn: "যোগাযোগ" },
  { key: "nav.signIn", en: "Sign in", bn: "সাইন ইন" },
  { key: "nav.dashboard", en: "Dashboard", bn: "ড্যাশবোর্ড" },
  { key: "nav.orders", en: "Orders", bn: "অর্ডার" },
  { key: "nav.settings", en: "Settings", bn: "সেটিংস" },
  { key: "nav.logout", en: "Log out", bn: "লগ আউট" },

  // --- Footer ---
  {
    key: "footer.blurb",
    en: "Quality products, fast shipping, and a storefront you can trust.",
    bn: "মানসম্পন্ন পণ্য, দ্রুত শিপিং, এবং একটি নির্ভরযোগ্য অনলাইন শপ।",
  },
  { key: "footer.shop", en: "Shop", bn: "শপ" },
  { key: "footer.company", en: "Company", bn: "কোম্পানি" },
  { key: "footer.privacy", en: "Privacy Policy", bn: "গোপনীয়তা নীতি" },
  { key: "footer.terms", en: "Terms of Service", bn: "ব্যবহারের শর্তাবলী" },
  { key: "footer.shipping", en: "Shipping & Delivery", bn: "শিপিং ও ডেলিভারি" },
  { key: "footer.returns", en: "Returns & Exchanges", bn: "রিটার্ন ও এক্সচেঞ্জ" },
  { key: "footer.allRightsReserved", en: "All rights reserved.", bn: "সর্বস্বত্ব সংরক্ষিত।" },

  // --- Language switcher ---
  { key: "language.english", en: "English", bn: "ইংরেজি" },
  { key: "language.bangla", en: "বাংলা", bn: "বাংলা" },

  // --- WhatsApp button ---
  { key: "whatsapp.chatWithUs", en: "Chat with us on WhatsApp", bn: "হোয়াটসঅ্যাপে আমাদের সাথে চ্যাট করুন" },
  {
    key: "whatsapp.defaultMessage",
    en: "Hi! I have a question about your products.",
    bn: "হ্যালো! আপনাদের পণ্য সম্পর্কে আমার একটি প্রশ্ন আছে।",
  },
];
