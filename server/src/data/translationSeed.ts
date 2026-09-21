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

  // --- Common (more, shared across sections) ---
  { key: "common.apply", en: "Apply", bn: "প্রয়োগ করুন" },
  { key: "common.applied", en: "Applied", bn: "প্রয়োগ করা হয়েছে" },
  { key: "common.remove", en: "Remove", bn: "সরান" },
  { key: "common.delete", en: "Delete", bn: "মুছুন" },
  { key: "common.copy", en: "Copy", bn: "কপি করুন" },
  { key: "common.share", en: "Share", bn: "শেয়ার করুন" },
  { key: "common.close", en: "Close", bn: "বন্ধ করুন" },
  { key: "common.free", en: "Free", bn: "ফ্রি" },
  { key: "common.comingSoon", en: "Coming soon", bn: "শীঘ্রই আসছে" },
  { key: "common.breadcrumb", en: "Breadcrumb", bn: "ব্রেডক্রাম্ব" },
  { key: "common.pagination", en: "Pagination", bn: "পেজিনেশন" },
  { key: "common.previousPage", en: "Previous page", bn: "পূর্ববর্তী পাতা" },
  { key: "common.nextPage", en: "Next page", bn: "পরবর্তী পাতা" },
  { key: "common.shareThisLink", en: "Share this link", bn: "এই লিংকটি শেয়ার করুন" },

  // --- Product card / grid / gallery ---
  { key: "product.noImage", en: "No image", bn: "কোনো ছবি নেই" },
  { key: "product.outOfStock", en: "Out of stock", bn: "স্টকে নেই" },
  { key: "product.deliveryFrom", en: "From {fee} delivery", bn: "{fee} থেকে ডেলিভারি" },
  { key: "product.freeDelivery", en: "Free delivery", bn: "ফ্রি ডেলিভারি" },
  {
    key: "product.promoWithCode",
    en: "{discount} with code {code}",
    bn: "{code} কোডে {discount}",
  },
  { key: "product.noneFound", en: "No products found.", bn: "কোনো পণ্য পাওয়া যায়নি।" },
  { key: "product.showImageN", en: "Show image {n}", bn: "ছবি {n} দেখান" },
  { key: "product.clearFilter", en: "Clear filter", bn: "ফিল্টার মুছুন" },
  { key: "product.description", en: "Description", bn: "বিবরণ" },
  { key: "product.youMightAlsoLike", en: "You might also like", bn: "আপনার আরও ভালো লাগতে পারে" },

  // --- Product buy box ---
  { key: "product.addedToCart", en: "Added {quantity} to cart", bn: "{quantity}টি কার্টে যোগ করা হয়েছে" },
  { key: "product.codeApplied", en: 'Code "{code}" applied', bn: '"{code}" কোড প্রয়োগ করা হয়েছে' },
  {
    key: "product.deliveryFeesBoth",
    en: "{insideFee} inside city · {outsideFee} outside city",
    bn: "শহরের ভিতরে {insideFee} · শহরের বাইরে {outsideFee}",
  },
  { key: "product.inStock", en: "In stock", bn: "স্টকে আছে" },
  {
    key: "product.inStockLimited",
    en: "In stock — only {count} left",
    bn: "স্টকে আছে — মাত্র {count}টি বাকি",
  },
  { key: "product.quantity", en: "Quantity", bn: "পরিমাণ" },
  { key: "product.decreaseQuantity", en: "Decrease quantity", bn: "পরিমাণ কমান" },
  { key: "product.increaseQuantity", en: "Increase quantity", bn: "পরিমাণ বাড়ান" },
  { key: "product.addToCart", en: "Add to Cart", bn: "কার্টে যোগ করুন" },
  { key: "product.buyNow", en: "Buy Now", bn: "এখনই কিনুন" },

  // --- Product reviews ---
  { key: "product.starsOutOf5", en: "{value} out of 5 stars", bn: "৫টির মধ্যে {value} তারকা" },
  { key: "product.leaveReview", en: "Leave a review", bn: "একটি রিভিউ দিন" },
  { key: "product.rateNOutOf5", en: "Rate {n} out of 5", bn: "৫টির মধ্যে {n} রেট করুন" },
  {
    key: "product.reviewPlaceholder",
    en: "Share your thoughts about this product...",
    bn: "এই পণ্য সম্পর্কে আপনার মতামত জানান...",
  },
  { key: "product.submitting", en: "Submitting...", bn: "জমা দেওয়া হচ্ছে..." },
  { key: "product.submitReview", en: "Submit review", bn: "রিভিউ জমা দিন" },
  { key: "product.reviews", en: "Reviews", bn: "রিভিউ" },
  { key: "product.reviewCount.one", en: "{count} review", bn: "{count}টি রিভিউ" },
  { key: "product.reviewCount.other", en: "{count} reviews", bn: "{count}টি রিভিউ" },
  { key: "product.toLeaveAReview", en: "to leave a review.", bn: "রিভিউ দেওয়ার জন্য।" },
  { key: "product.loadingReviews", en: "Loading reviews...", bn: "রিভিউ লোড হচ্ছে..." },
  {
    key: "product.noReviewsYet",
    en: "No reviews yet — be the first to share your thoughts.",
    bn: "এখনো কোনো রিভিউ নেই — প্রথম মতামত দিন।",
  },
  { key: "product.verifiedPurchase", en: "Verified purchase", bn: "যাচাইকৃত ক্রয়" },
  { key: "product.deleteReview", en: "Delete review", bn: "রিভিউ মুছুন" },
  {
    key: "product.confirmDeleteReview",
    en: "Delete this review? This can't be undone.",
    bn: "এই রিভিউটি মুছবেন? এটি ফিরিয়ে আনা যাবে না।",
  },

  // --- Cart ---
  { key: "cart.yourCart", en: "Your cart", bn: "আপনার কার্ট" },
  { key: "cart.empty", en: "Your cart is empty.", bn: "আপনার কার্ট খালি।" },
  { key: "cart.invalidPromoCode", en: "Invalid promo code", bn: "অবৈধ প্রোমো কোড" },
  { key: "cart.codeAppliedInline", en: "Code {code} applied", bn: "{code} কোড প্রয়োগ করা হয়েছে" },
  { key: "cart.promoCode", en: "Promo code", bn: "প্রোমো কোড" },
  { key: "cart.removeItem", en: "Remove item", bn: "আইটেম সরান" },
  { key: "cart.subtotal", en: "Subtotal", bn: "সাবটোটাল" },
  { key: "cart.discount", en: "Discount", bn: "ছাড়" },
  { key: "cart.total", en: "Total", bn: "সর্বমোট" },
  { key: "cart.items", en: "Items", bn: "পণ্যসমূহ" },
  { key: "cart.proceedToCheckout", en: "Proceed to checkout", bn: "চেকআউট করুন" },

  // --- Checkout ---
  { key: "checkout.failedToCreateLink", en: "Failed to create link", bn: "লিংক তৈরি করা যায়নি" },
  { key: "checkout.linkCopied", en: "Link copied", bn: "লিংক কপি করা হয়েছে" },
  {
    key: "checkout.copyManually",
    en: "Couldn't copy — copy it manually",
    bn: "কপি করা যায়নি — নিজে কপি করুন",
  },
  {
    key: "checkout.askSomeoneElseTitle",
    en: "Want someone else to pay for this?",
    bn: "চান অন্য কেউ এর জন্য টাকা দিক?",
  },
  {
    key: "checkout.askSomeoneElseSubtitle",
    en: "Share a link to this cart — whoever opens it can check out and pay for it themselves.",
    bn: "এই কার্টের একটি লিংক শেয়ার করুন — যে কেউ এটি খুলে নিজে চেকআউট ও পেমেন্ট করতে পারবে।",
  },
  {
    key: "checkout.pleasePayFor",
    en: "Please pay for my order on {siteName}:",
    bn: "{siteName}-এ আমার অর্ডারের জন্য পেমেন্ট করুন:",
  },
  { key: "checkout.creatingLink", en: "Creating link...", bn: "লিংক তৈরি হচ্ছে..." },
  { key: "checkout.createShareableLink", en: "Create shareable link", bn: "শেয়ারযোগ্য লিংক তৈরি করুন" },
  { key: "checkout.orderPlaced", en: "Order placed!", bn: "অর্ডার সম্পন্ন হয়েছে!" },
  {
    key: "checkout.orderSummaryLine",
    en: "Order #{id} — {amount}{suffix}",
    bn: "অর্ডার #{id} — {amount}{suffix}",
  },
  { key: "checkout.paidOnDelivery", en: ", paid on delivery.", bn: ", ডেলিভারির সময় পরিশোধিত।" },
  { key: "checkout.viewYourOrders", en: "View your orders", bn: "আপনার অর্ডার দেখুন" },
  { key: "checkout.continueShopping", en: "Continue shopping", bn: "কেনাকাটা চালিয়ে যান" },
  { key: "checkout.failedToPlaceOrder", en: "Failed to place order", bn: "অর্ডার করা যায়নি" },
  { key: "checkout.emptyCartTitle", en: "Your cart is empty", bn: "আপনার কার্ট খালি" },
  {
    key: "checkout.emptyCartSubtitle",
    en: "Add something to your cart before checking out.",
    bn: "চেকআউটের আগে কার্টে কিছু যোগ করুন।",
  },
  { key: "checkout.browseTheShop", en: "Browse the shop", bn: "শপ দেখুন" },
  { key: "checkout.title", en: "Checkout", bn: "চেকআউট" },
  { key: "checkout.subtitle", en: "Choose how you'd like to pay below.", bn: "নিচে থেকে পেমেন্ট পদ্ধতি বেছে নিন।" },
  { key: "checkout.deliveryDetails", en: "Delivery details", bn: "ডেলিভারির বিবরণ" },
  {
    key: "checkout.useSavedDetails",
    en: "Use my saved delivery details",
    bn: "আমার সংরক্ষিত ডেলিভারি তথ্য ব্যবহার করুন",
  },
  { key: "checkout.deliverToNewAddress", en: "Deliver to a new address", bn: "নতুন ঠিকানায় ডেলিভারি করুন" },
  { key: "checkout.fullName", en: "Full name", bn: "পূর্ণ নাম" },
  { key: "checkout.phone", en: "Phone", bn: "ফোন" },
  { key: "checkout.houseRoadArea", en: "House / Road / Area", bn: "বাসা / রোড / এলাকা" },
  {
    key: "checkout.houseRoadAreaPlaceholder",
    en: "House no., road, area...",
    bn: "বাসা নং, রোড, এলাকা...",
  },
  { key: "checkout.deliveryRatesApply", en: "{zone} delivery rates apply.", bn: "{zone} ডেলিভারি হার প্রযোজ্য।" },
  { key: "checkout.insideCity", en: "Inside {city}", bn: "{city}-এর ভিতরে" },
  { key: "checkout.outsideCity", en: "Outside {city}", bn: "{city}-এর বাইরে" },
  {
    key: "checkout.saveForNextTime",
    en: "Save this phone number and address for next time",
    bn: "পরবর্তী সময়ের জন্য এই ফোন নম্বর ও ঠিকানা সংরক্ষণ করুন",
  },
  {
    key: "checkout.smsOptIn",
    en: "Send me SMS about offers and promotions",
    bn: "অফার ও প্রোমোশন সম্পর্কে আমাকে এসএমএস পাঠান",
  },
  { key: "checkout.paymentMethod", en: "Payment method", bn: "পেমেন্ট পদ্ধতি" },
  { key: "checkout.orderSummary", en: "Order summary", bn: "অর্ডার সারাংশ" },
  { key: "checkout.qty", en: "Qty {n}", bn: "পরিমাণ {n}" },
  { key: "checkout.delivery", en: "Delivery", bn: "ডেলিভারি" },
  { key: "checkout.selectAZila", en: "Select a Zila", bn: "একটি জেলা নির্বাচন করুন" },
  { key: "checkout.discountWithCode", en: "Discount ({code})", bn: "ছাড় ({code})" },
  { key: "checkout.placingOrder", en: "Placing order...", bn: "অর্ডার করা হচ্ছে..." },
  { key: "checkout.placeOrder", en: "Place order ({method})", bn: "অর্ডার করুন ({method})" },
  { key: "checkout.cashOnDelivery", en: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },

  // --- Payment method picker ---
  { key: "payment.cod.label", en: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },
  {
    key: "payment.cod.description",
    en: "Pay in cash when your order arrives",
    bn: "অর্ডার পৌঁছালে নগদে পরিশোধ করুন",
  },
  { key: "payment.bkash.label", en: "bKash", bn: "বিকাশ" },
  {
    key: "payment.bkash.description",
    en: "Pay instantly from your bKash wallet",
    bn: "আপনার বিকাশ ওয়ালেট থেকে তাৎক্ষণিক পরিশোধ করুন",
  },

  // --- bKash payment result page ---
  { key: "bkash.paymentSuccessful", en: "Payment successful!", bn: "পেমেন্ট সফল হয়েছে!" },
  {
    key: "bkash.orderPaidSummary",
    en: "Order #{id} — {amount}, paid via bKash.",
    bn: "অর্ডার #{id} — {amount}, বিকাশের মাধ্যমে পরিশোধিত।",
  },
  {
    key: "bkash.paymentWentThrough",
    en: "Your bKash payment went through.",
    bn: "আপনার বিকাশ পেমেন্ট সম্পন্ন হয়েছে।",
  },
  {
    key: "bkash.cancelled",
    en: "You cancelled the bKash payment — nothing was charged, and your cart is still here.",
    bn: "আপনি বিকাশ পেমেন্ট বাতিল করেছেন — কোনো টাকা কাটা হয়নি, আপনার কার্ট এখনও আছে।",
  },
  {
    key: "bkash.failed",
    en: "The bKash payment didn't go through — nothing was charged, and your cart is still here.",
    bn: "বিকাশ পেমেন্ট সম্পন্ন হয়নি — কোনো টাকা কাটা হয়নি, আপনার কার্ট এখনও আছে।",
  },
  { key: "bkash.notCompleted", en: "Payment not completed", bn: "পেমেন্ট সম্পন্ন হয়নি" },
  { key: "bkash.backToCheckout", en: "Back to checkout", bn: "চেকআউটে ফিরে যান" },

  // --- "Ask someone else to pay" (shared cart) ---
  { key: "pay.addedToYourCart", en: "Added to your cart", bn: "আপনার কার্টে যোগ করা হয়েছে" },
  {
    key: "pay.wantsYouToPay",
    en: "{name} wants you to pay for this",
    bn: "{name} চান আপনি এর জন্য টাকা দিন",
  },
  {
    key: "pay.reviewBelow",
    en: "Review it below, then check out and pay for it yourself.",
    bn: "নিচে দেখুন, তারপর নিজে চেকআউট করে পরিশোধ করুন।",
  },
  { key: "pay.alreadyPaid", en: "This has already been paid for.", bn: "এটির জন্য ইতিমধ্যে পরিশোধ করা হয়েছে।" },
  { key: "pay.itemsTotal", en: "Items total", bn: "পণ্যের সর্বমোট" },
  {
    key: "pay.deliveryFeeAtCheckout",
    en: "Delivery fee is added at checkout.",
    bn: "চেকআউটের সময় ডেলিভারি চার্জ যোগ হবে।",
  },
  { key: "pay.continueToCheckout", en: "Continue to checkout", bn: "চেকআউটে যান" },
  { key: "pay.signInToContinue", en: "Sign in to continue", bn: "চালিয়ে যেতে সাইন ইন করুন" },

  // --- Address fields (Zila/Upazila) ---
  { key: "address.zila", en: "Zila (District)", bn: "জেলা" },
  { key: "address.selectZila", en: "Select Zila", bn: "জেলা নির্বাচন করুন" },
  { key: "address.upazila", en: "Upazila", bn: "উপজেলা" },
  { key: "address.selectUpazila", en: "Select Upazila", bn: "উপজেলা নির্বাচন করুন" },
  { key: "address.selectZilaFirst", en: "Select a Zila first", bn: "প্রথমে একটি জেলা নির্বাচন করুন" },
];
