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

  // --- Common (shared across sections) ---
  { key: "common.viewAll", en: "View all", bn: "সব দেখুন" },
  { key: "common.shopAll", en: "Shop all", bn: "সব দেখুন" },

  // --- Homepage: trust badges ---
  { key: "trust.fastDelivery.title", en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" },
  {
    key: "trust.fastDelivery.description",
    en: "Reliable delivery inside and outside {city}.",
    bn: "{city}-এর ভিতরে ও বাইরে নির্ভরযোগ্য ডেলিভারি।",
  },
  { key: "trust.secureShopping.title", en: "Secure Shopping", bn: "নিরাপদ কেনাকাটা" },
  {
    key: "trust.secureShopping.description",
    en: "Your data and payments are protected.",
    bn: "আপনার তথ্য ও পেমেন্ট সুরক্ষিত।",
  },
  { key: "trust.easyReturns.title", en: "Easy Returns", bn: "সহজ রিটার্ন" },
  {
    key: "trust.easyReturns.description",
    en: "Hassle-free returns on eligible items.",
    bn: "উপযুক্ত পণ্যে ঝামেলাবিহীন রিটার্ন।",
  },
  { key: "trust.support.title", en: "Dedicated Support", bn: "নিবেদিত সহায়তা" },
  {
    key: "trust.support.description",
    en: "We're here to help with any questions.",
    bn: "যেকোনো প্রশ্নে আমরা সাহায্য করতে প্রস্তুত।",
  },

  // --- Homepage: FAQ ---
  { key: "faq.heading", en: "Frequently Asked Questions", bn: "সাধারণ জিজ্ঞাসা" },
  { key: "faq.deliveryTime.question", en: "How long does delivery take?", bn: "ডেলিভারি হতে কতদিন লাগে?" },
  {
    key: "faq.deliveryTime.answer",
    en: "Orders inside {city} are typically delivered within 1-2 business days. Outside {city}, delivery usually takes 3-5 business days depending on the courier.",
    bn: "{city}-এর ভিতরে অর্ডার সাধারণত ১-২ কার্যদিবসের মধ্যে ডেলিভারি হয়। {city}-এর বাইরে কুরিয়ারের উপর নির্ভর করে সাধারণত ৩-৫ কার্যদিবস সময় লাগে।",
  },
  {
    key: "faq.payment.question",
    en: "What payment methods do you accept?",
    bn: "আপনারা কোন কোন পেমেন্ট পদ্ধতি গ্রহণ করেন?",
  },
  {
    key: "faq.payment.answer",
    en: "We accept cash on delivery, along with major mobile banking and card payment options at checkout.",
    bn: "আমরা ক্যাশ অন ডেলিভারি গ্রহণ করি, পাশাপাশি চেকআউটে প্রধান মোবাইল ব্যাংকিং ও কার্ড পেমেন্টের সুবিধাও রয়েছে।",
  },
  {
    key: "faq.returns.question",
    en: "Can I return or exchange a product?",
    bn: "আমি কি কোনো পণ্য রিটার্ন বা এক্সচেঞ্জ করতে পারি?",
  },
  {
    key: "faq.returns.answer",
    en: "Yes — most items can be returned or exchanged within 7 days of delivery, as long as they're unused and in their original packaging.",
    bn: "হ্যাঁ — বেশিরভাগ পণ্য ডেলিভারির ৭ দিনের মধ্যে রিটার্ন বা এক্সচেঞ্জ করা যায়, যদি সেগুলো অব্যবহৃত ও মূল প্যাকেজিংয়ে থাকে।",
  },
  { key: "faq.tracking.question", en: "How do I track my order?", bn: "আমি কীভাবে আমার অর্ডার ট্র্যাক করব?" },
  {
    key: "faq.tracking.answer",
    en: "Once you're logged in, visit your Dashboard or Orders page to see the current status of every order you've placed.",
    bn: "লগইন করার পর, আপনার ড্যাশবোর্ড বা অর্ডার পেজে গিয়ে প্রতিটি অর্ডারের বর্তমান অবস্থা দেখতে পারবেন।",
  },
  {
    key: "faq.promoCodes.question",
    en: "Do you offer discounts or promo codes?",
    bn: "আপনারা কি ছাড় বা প্রোমো কোড দিয়ে থাকেন?",
  },
  {
    key: "faq.promoCodes.answer",
    en: "Yes — keep an eye on our homepage banners and product pages for active promo codes, or check with us before checkout.",
    bn: "হ্যাঁ — সক্রিয় প্রোমো কোডের জন্য আমাদের হোমপেজের ব্যানার ও প্রোডাক্ট পেজে নজর রাখুন, অথবা চেকআউটের আগে আমাদের সাথে যোগাযোগ করুন।",
  },

  // --- Homepage: category showcase / category tiles ---
  { key: "category.shopByCategory", en: "Shop by Category", bn: "ক্যাটাগরি অনুযায়ী কেনাকাটা" },
  { key: "category.empty", en: "No categories yet.", bn: "এখনো কোনো ক্যাটাগরি নেই।" },
  { key: "category.productCount.one", en: "{count} product", bn: "{count}টি পণ্য" },
  { key: "category.productCount.other", en: "{count} products", bn: "{count}টি পণ্য" },

  // --- Homepage: featured products / new arrivals ---
  { key: "home.newArrivals.title", en: "New Arrivals", bn: "নতুন সংযোজন" },
  { key: "home.newArrivals.subtitle", en: "Fresh additions to the catalog.", bn: "ক্যাটালগে নতুন যুক্ত পণ্য।" },
  { key: "home.featured.title", en: "Featured Products", bn: "বাছাইকৃত পণ্য" },
  { key: "home.featured.subtitle", en: "Hand-picked, just for you.", bn: "শুধু আপনার জন্য বাছাই করা।" },
];
