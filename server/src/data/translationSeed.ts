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

  // --- Common (more) ---
  { key: "common.edit", en: "Edit", bn: "সম্পাদনা করুন" },
  { key: "common.add", en: "Add", bn: "যোগ করুন" },

  // --- Auth modal / pages ---
  { key: "auth.continueWithGoogle", en: "Continue with Google", bn: "গুগল দিয়ে চালিয়ে যান" },
  { key: "auth.loggedIn", en: "Logged in", bn: "লগইন সম্পন্ন" },
  { key: "auth.loginFailed", en: "Login failed", bn: "লগইন ব্যর্থ হয়েছে" },
  { key: "auth.email", en: "Email", bn: "ইমেইল" },
  { key: "auth.password", en: "Password", bn: "পাসওয়ার্ড" },
  { key: "auth.forgotPassword", en: "Forgot password?", bn: "পাসওয়ার্ড ভুলে গেছেন?" },
  { key: "auth.loggingIn", en: "Logging in...", bn: "লগইন হচ্ছে..." },
  { key: "auth.logIn", en: "Log in", bn: "লগইন" },
  { key: "auth.noAccount", en: "Don't have an account?", bn: "অ্যাকাউন্ট নেই?" },
  { key: "auth.signUp", en: "Sign up", bn: "সাইন আপ" },
  {
    key: "auth.resetLinkSent",
    en: "If an account with that email exists, we've sent a link to reset your password.",
    bn: "সেই ইমেইলে কোনো অ্যাকাউন্ট থাকলে, আমরা পাসওয়ার্ড রিসেট করার একটি লিংক পাঠিয়েছি।",
  },
  { key: "auth.backToSignIn", en: "Back to sign in", bn: "সাইন ইনে ফিরে যান" },
  {
    key: "auth.forgotPasswordInstructions",
    en: "Enter your account's email and we'll send a link to reset your password.",
    bn: "আপনার অ্যাকাউন্টের ইমেইল দিন, আমরা পাসওয়ার্ড রিসেট করার লিংক পাঠাব।",
  },
  { key: "auth.sending", en: "Sending...", bn: "পাঠানো হচ্ছে..." },
  { key: "auth.sendResetLink", en: "Send reset link", bn: "রিসেট লিংক পাঠান" },
  { key: "auth.accountCreated", en: "Account created", bn: "অ্যাকাউন্ট তৈরি হয়েছে" },
  { key: "auth.signUpFailed", en: "Sign up failed", bn: "সাইন আপ ব্যর্থ হয়েছে" },
  { key: "auth.creatingAccount", en: "Creating account...", bn: "অ্যাকাউন্ট তৈরি হচ্ছে..." },
  { key: "auth.alreadyHaveAccount", en: "Already have an account?", bn: "ইতিমধ্যে অ্যাকাউন্ট আছে?" },
  { key: "auth.or", en: "OR", bn: "অথবা" },
  { key: "auth.verificationEmailSent", en: "Verification email sent", bn: "যাচাইকরণ ইমেইল পাঠানো হয়েছে" },
  {
    key: "auth.failedToSendVerification",
    en: "Failed to send verification email",
    bn: "যাচাইকরণ ইমেইল পাঠানো যায়নি",
  },
  {
    key: "auth.pleaseVerifyEmail",
    en: "Please verify your email address ({email}) to secure your account.",
    bn: "আপনার অ্যাকাউন্ট সুরক্ষিত করতে আপনার ইমেইল ঠিকানা ({email}) যাচাই করুন।",
  },
  { key: "auth.emailSent", en: "Email sent", bn: "ইমেইল পাঠানো হয়েছে" },
  { key: "auth.resendEmail", en: "Resend email", bn: "আবার ইমেইল পাঠান" },
  {
    key: "auth.verifyLinkInvalid",
    en: "This verification link is invalid or has expired.",
    bn: "এই যাচাইকরণ লিংকটি অবৈধ অথবা মেয়াদোত্তীর্ণ।",
  },
  { key: "auth.verifyingEmail", en: "Verifying your email...", bn: "আপনার ইমেইল যাচাই করা হচ্ছে..." },
  { key: "auth.emailVerified", en: "Email verified", bn: "ইমেইল যাচাই সম্পন্ন" },
  { key: "auth.allSet", en: "You're all set.", bn: "আপনি প্রস্তুত।" },
  { key: "auth.couldntVerifyEmail", en: "Couldn't verify email", bn: "ইমেইল যাচাই করা যায়নি" },
  {
    key: "auth.verifyLinkMissingToken",
    en: "This link is missing its token — copy the full link from your email.",
    bn: "এই লিংকে টোকেন নেই — আপনার ইমেইল থেকে সম্পূর্ণ লিংক কপি করুন।",
  },
  { key: "auth.goToDashboard", en: "Go to your dashboard", bn: "আপনার ড্যাশবোর্ডে যান" },
  { key: "auth.passwordUpdated", en: "Password updated", bn: "পাসওয়ার্ড আপডেট হয়েছে" },
  { key: "auth.failedToResetPassword", en: "Failed to reset password", bn: "পাসওয়ার্ড রিসেট করা যায়নি" },
  { key: "auth.invalidLink", en: "Invalid link", bn: "অবৈধ লিংক" },
  {
    key: "auth.resetLinkMissingToken",
    en: "This password reset link is missing its token — copy the full link from your email.",
    bn: "এই পাসওয়ার্ড রিসেট লিংকে টোকেন নেই — আপনার ইমেইল থেকে সম্পূর্ণ লিংক কপি করুন।",
  },
  {
    key: "auth.signedInPickUp",
    en: "You're signed in — pick up where you left off.",
    bn: "আপনি সাইন ইন করেছেন — যেখানে রেখেছিলেন সেখান থেকে চালিয়ে যান।",
  },
  { key: "auth.chooseNewPassword", en: "Choose a new password", bn: "একটি নতুন পাসওয়ার্ড বাছাই করুন" },
  {
    key: "auth.atLeast6Chars",
    en: "Make it at least 6 characters — you'll be signed in right after.",
    bn: "কমপক্ষে ৬ অক্ষরের হতে হবে — এরপরই আপনি সাইন ইন হয়ে যাবেন।",
  },
  { key: "auth.newPassword", en: "New password", bn: "নতুন পাসওয়ার্ড" },
  { key: "auth.confirmNewPassword", en: "Confirm new password", bn: "নতুন পাসওয়ার্ড নিশ্চিত করুন" },
  { key: "auth.updating", en: "Updating...", bn: "আপডেট হচ্ছে..." },
  { key: "auth.updatePassword", en: "Update password", bn: "পাসওয়ার্ড আপডেট করুন" },
  { key: "auth.backToTheStore", en: "Back to the store", bn: "শপে ফিরে যান" },

  // --- Account sidebar ---
  { key: "account.backToStore", en: "Back to store", bn: "শপে ফিরে যান" },
  { key: "account.menu", en: "Menu", bn: "মেনু" },

  // --- Wishlist ---
  { key: "wishlist.failedToUpdate", en: "Failed to update wishlist", bn: "উইশলিস্ট আপডেট করা যায়নি" },
  { key: "wishlist.remove", en: "Remove from wishlist", bn: "উইশলিস্ট থেকে সরান" },
  { key: "wishlist.save", en: "Save to wishlist", bn: "উইশলিস্টে সংরক্ষণ করুন" },

  // --- Order status (customer-facing) ---
  { key: "order.status.pending", en: "Pending", bn: "অপেক্ষমাণ" },
  { key: "order.status.paid", en: "Paid", bn: "পরিশোধিত" },
  { key: "order.status.shipped", en: "Shipped", bn: "পাঠানো হয়েছে" },
  { key: "order.status.delivered", en: "Delivered", bn: "ডেলিভারি সম্পন্ন" },
  { key: "order.status.cancelled", en: "Cancelled", bn: "বাতিল" },

  // --- Dashboard ---
  {
    key: "dashboard.promoReminder",
    en: "{discount} storewide with code {code} — Shop now",
    bn: "{code} কোডে পুরো শপে {discount} — এখনই কিনুন",
  },
  { key: "dashboard.writeAReview", en: "Write a review", bn: "একটি রিভিউ লিখুন" },
  { key: "dashboard.failedToRemoveItem", en: "Failed to remove item", bn: "আইটেম সরানো যায়নি" },
  {
    key: "dashboard.movedEverythingToCart",
    en: "Moved everything to your cart",
    bn: "সবকিছু আপনার কার্টে সরানো হয়েছে",
  },
  {
    key: "dashboard.someItemsCouldntMove",
    en: "Some items couldn't be moved — the rest were added",
    bn: "কিছু আইটেম সরানো যায়নি — বাকিগুলো যোগ করা হয়েছে",
  },
  { key: "dashboard.savedItems", en: "Saved items", bn: "সংরক্ষিত আইটেম" },
  { key: "dashboard.moving", en: "Moving...", bn: "সরানো হচ্ছে..." },
  { key: "dashboard.moveAllToCart", en: "Move all to cart", bn: "সব কার্টে সরান" },
  {
    key: "dashboard.removeFromSavedItems",
    en: "Remove {name} from saved items",
    bn: "সংরক্ষিত আইটেম থেকে {name} সরান",
  },
  {
    key: "dashboard.noneAvailableAnymore",
    en: "None of these products are available anymore",
    bn: "এই পণ্যগুলোর কোনোটিই আর পাওয়া যাচ্ছে না",
  },
  { key: "dashboard.welcomeBackName", en: "Welcome back, {name}", bn: "ফিরে আসার জন্য স্বাগতম, {name}" },
  { key: "dashboard.welcomeBack", en: "Welcome back", bn: "ফিরে আসার জন্য স্বাগতম" },
  { key: "dashboard.quickLook", en: "Here's a quick look at your account.", bn: "আপনার অ্যাকাউন্টের সংক্ষিপ্ত বিবরণ।" },
  { key: "dashboard.totalOrders", en: "Total orders", bn: "মোট অর্ডার" },
  { key: "dashboard.account", en: "Account", bn: "অ্যাকাউন্ট" },
  { key: "dashboard.role", en: "Role", bn: "ভূমিকা" },
  { key: "dashboard.coAdmin", en: "Co-admin", bn: "সহ-অ্যাডমিন" },
  { key: "dashboard.deliveryLocation", en: "Delivery location", bn: "ডেলিভারি ঠিকানা" },
  { key: "checkout.deliveryRatesApplyShort", en: "{zone} delivery", bn: "{zone} ডেলিভারি" },
  {
    key: "dashboard.noDeliveryLocation",
    en: "No delivery location saved yet —",
    bn: "এখনো কোনো ডেলিভারি ঠিকানা সংরক্ষিত নেই —",
  },
  { key: "dashboard.addOne", en: "add one", bn: "একটি যোগ করুন" },
  {
    key: "dashboard.soWeKnowFee",
    en: "so we know which delivery fee applies to you.",
    bn: "যাতে আমরা জানতে পারি কোন ডেলিভারি চার্জ আপনার জন্য প্রযোজ্য।",
  },
  { key: "dashboard.recentOrders", en: "Recent orders", bn: "সাম্প্রতিক অর্ডার" },
  { key: "dashboard.loadingYourOrders", en: "Loading your orders...", bn: "আপনার অর্ডার লোড হচ্ছে..." },
  { key: "dashboard.noOrdersYet", en: "You haven't placed any orders yet.", bn: "আপনি এখনো কোনো অর্ডার করেননি।" },
  { key: "dashboard.startShopping", en: "Start shopping", bn: "কেনাকাটা শুরু করুন" },
  { key: "dashboard.orderHash", en: "Order #{id}", bn: "অর্ডার #{id}" },
  { key: "dashboard.itemCount.one", en: "{count} item", bn: "{count}টি পণ্য" },
  { key: "dashboard.itemCount.other", en: "{count} items", bn: "{count}টি পণ্য" },
  { key: "dashboard.reorder", en: "Reorder", bn: "পুনরায় অর্ডার করুন" },
  { key: "dashboard.viewOrders", en: "View orders", bn: "অর্ডার দেখুন" },
  { key: "dashboard.accountSettings", en: "Account settings", bn: "অ্যাকাউন্ট সেটিংস" },

  // --- Orders page ---
  { key: "orders.confirmCancel", en: "Cancel this order? This can't be undone.", bn: "এই অর্ডার বাতিল করবেন? এটি ফিরিয়ে আনা যাবে না।" },
  { key: "orders.cancelOrder", en: "Cancel order", bn: "অর্ডার বাতিল করুন" },
  { key: "orders.orderCancelled", en: "Order cancelled", bn: "অর্ডার বাতিল করা হয়েছে" },
  { key: "orders.failedToCancel", en: "Failed to cancel order", bn: "অর্ডার বাতিল করা যায়নি" },
  { key: "orders.yourOrders", en: "Your orders", bn: "আপনার অর্ডার" },
  { key: "orders.everyOrderPlaced", en: "Every order placed on this account.", bn: "এই অ্যাকাউন্টে করা প্রতিটি অর্ডার।" },
  {
    key: "orders.productNoLongerAvailable",
    en: "Product no longer available",
    bn: "পণ্যটি আর পাওয়া যাচ্ছে না",
  },
  { key: "orders.qtyEach", en: "Qty {quantity} · {price} each", bn: "পরিমাণ {quantity} · প্রতিটি {price}" },
  {
    key: "orders.shippingTo",
    en: "Shipping to {name} ({phone}) — {address}, {upazila}, {zila}",
    bn: "{name} ({phone})-এর কাছে পাঠানো হচ্ছে — {address}, {upazila}, {zila}",
  },
  { key: "orders.cancelling", en: "Cancelling...", bn: "বাতিল করা হচ্ছে..." },
  {
    key: "orders.payOnlineBeforeReceiving",
    en: "Pay online before receiving",
    bn: "পাওয়ার আগে অনলাইনে পরিশোধ করুন",
  },
  { key: "orders.payBeforeReceiving", en: "Pay before receiving", bn: "পাওয়ার আগে পরিশোধ করুন" },
  {
    key: "orders.skipCashAtDoor",
    en: "Skip paying cash at the door — settle this order online instead, once one of these is switched on:",
    bn: "দরজায় নগদ পরিশোধ এড়িয়ে যান — এর পরিবর্তে অনলাইনে এই অর্ডার পরিশোধ করুন, নিচের যেকোনো একটি চালু হলে:",
  },
  {
    key: "orders.onlinePaymentNotLive",
    en: "Online payment isn't live yet, so for now this order will still be collected as Cash on Delivery. We'll let you know the moment it's ready.",
    bn: "অনলাইন পেমেন্ট এখনও চালু হয়নি, তাই আপাতত এই অর্ডারটি ক্যাশ অন ডেলিভারি হিসেবেই সংগ্রহ করা হবে। প্রস্তুত হলেই আমরা আপনাকে জানাব।",
  },

  // --- Settings ---
  { key: "settings.profileUpdated", en: "Profile updated", bn: "প্রোফাইল আপডেট হয়েছে" },
  { key: "settings.failedToUpdateProfile", en: "Failed to update profile", bn: "প্রোফাইল আপডেট করা যায়নি" },
  { key: "settings.profile", en: "Profile", bn: "প্রোফাইল" },
  { key: "settings.squareImagesWorkBest", en: "Square images work best.", bn: "বর্গাকার ছবি সবচেয়ে ভালো কাজ করে।" },
  { key: "settings.name", en: "Name", bn: "নাম" },
  { key: "settings.phonePlaceholder", en: "e.g. 01XXXXXXXXX", bn: "যেমন 01XXXXXXXXX" },
  {
    key: "settings.phoneHint",
    en: "Used as your default contact number at checkout.",
    bn: "চেকআউটে এটি আপনার ডিফল্ট যোগাযোগ নম্বর হিসেবে ব্যবহৃত হবে।",
  },
  { key: "settings.email", en: "Email", bn: "ইমেইল" },
  { key: "settings.emailCantBeChanged", en: "Email can't be changed here.", bn: "এখান থেকে ইমেইল পরিবর্তন করা যাবে না।" },
  { key: "settings.saving", en: "Saving...", bn: "সংরক্ষণ করা হচ্ছে..." },
  { key: "settings.saveChanges", en: "Save changes", bn: "পরিবর্তন সংরক্ষণ করুন" },
  { key: "settings.deliveryLocationSaved", en: "Delivery location saved", bn: "ডেলিভারি ঠিকানা সংরক্ষিত হয়েছে" },
  {
    key: "settings.failedToSaveDeliveryLocation",
    en: "Failed to save delivery location",
    bn: "ডেলিভারি ঠিকানা সংরক্ষণ করা যায়নি",
  },
  { key: "settings.saveLocation", en: "Save location", bn: "ঠিকানা সংরক্ষণ করুন" },
  {
    key: "settings.addPhoneForSms",
    en: "Add a phone number above before enabling SMS updates",
    bn: "এসএমএস আপডেট চালু করার আগে উপরে একটি ফোন নম্বর যোগ করুন",
  },
  {
    key: "settings.failedToUpdatePreferences",
    en: "Failed to update preferences",
    bn: "পছন্দ আপডেট করা যায়নি",
  },
  { key: "settings.promotions", en: "Promotions", bn: "প্রোমোশন" },
  {
    key: "settings.promotionsHint",
    en: "Off by default — opt in to hear about sales, new arrivals, and promo codes.",
    bn: "ডিফল্টভাবে বন্ধ — সেল, নতুন পণ্য ও প্রোমো কোড সম্পর্কে জানতে চালু করুন।",
  },
  { key: "settings.emailMeAboutPromotions", en: "Email me about promotions", bn: "প্রোমোশন সম্পর্কে আমাকে ইমেইল করুন" },
  { key: "settings.textMeAboutPromotions", en: "Text me about promotions", bn: "প্রোমোশন সম্পর্কে আমাকে এসএমএস করুন" },
  { key: "settings.addPhoneFirst", en: "(add a phone number above first)", bn: "(প্রথমে উপরে একটি ফোন নম্বর যোগ করুন)" },
  { key: "settings.failedToUpdatePassword", en: "Failed to update password", bn: "পাসওয়ার্ড আপডেট করা যায়নি" },
  { key: "settings.password", en: "Password", bn: "পাসওয়ার্ড" },
  { key: "settings.currentPassword", en: "Current password", bn: "বর্তমান পাসওয়ার্ড" },
  {
    key: "settings.manageProfileAndSecurity",
    en: "Manage your profile and account security.",
    bn: "আপনার প্রোফাইল ও অ্যাকাউন্ট নিরাপত্তা পরিচালনা করুন।",
  },
  {
    key: "settings.signedInWithGoogle",
    en: "You signed in with Google, so there's no password to manage here.",
    bn: "আপনি গুগল দিয়ে সাইন ইন করেছেন, তাই এখানে পরিচালনা করার মতো কোনো পাসওয়ার্ড নেই।",
  },
];
