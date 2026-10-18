// "About this page" help for every dashboard route: what the page is for,
// what to expect on it, and the short forms it uses. Shown in a side panel
// by views/PageHelpPanel.tsx.
//
// Customer pages carry an `i18n` prefix so their text is translated (keys
// `<prefix>.title`, `.summary`, `.expect.N`, `.termName.N`, `.term.N`, seeded in the
// server's translationSeed.ts). Admin pages stay English like the rest of
// the admin panel.

export interface PageHelpTerm {
  term: string;
  meaning: string;
}

export interface PageHelp {
  title: string;
  summary: string;
  expect: string[];
  terms: PageHelpTerm[];
  i18n?: string;
}

const ORDER_STATUS_TERMS: PageHelpTerm[] = [
  { term: "Pending", meaning: "Order placed, not yet confirmed or paid." },
  { term: "Paid", meaning: "Payment received (online), or the order is confirmed." },
  { term: "Shipped", meaning: "Handed to the courier and on its way." },
  { term: "Delivered", meaning: "The customer has received it." },
  { term: "Cancelled", meaning: "Stopped. Stock goes back automatically." },
];

const CUSTOMER_DASHBOARD: PageHelp = {
  i18n: "help.dashboard",
  title: "Dashboard",
  summary: "Your account at a glance: your latest orders and your delivery address.",
  expect: [
    "Your most recent orders and their status.",
    "Your saved delivery address, used to fill in checkout.",
    "Links to all your orders and your settings in the side menu.",
  ],
  terms: [
    { term: "COD", meaning: "Cash on Delivery: you pay the rider when the order arrives." },
    { term: "৳ / BDT", meaning: "Bangladeshi Taka, the currency all prices are in." },
  ],
};

const STAFF_DASHBOARD: PageHelp = {
  title: "Dashboard",
  summary: "A quick look at how the store is doing right now.",
  expect: [
    "Pending orders that still need action, total orders and revenue.",
    "Total products and a \"Running low\" list of products or sizes/colours with 5 or fewer left.",
    "You only see the parts your permissions allow.",
  ],
  terms: [
    { term: "Pending", meaning: "Orders placed but not yet confirmed or shipped." },
    { term: "Revenue", meaning: "Money from paid, shipped and delivered orders only." },
    { term: "Low stock (≤5)", meaning: "5 or fewer units left, counted per variant." },
  ],
};

const HELP: Record<string, PageHelp> = {
  "/orders/[id]": {
    i18n: "help.orderDetail",
    title: "Order details",
    summary: "One order: where it is now, what's in it and where it's going.",
    expect: [
      "The timeline shows each step with its date; the coloured step is where your order is now.",
      "Check your delivery address and phone. If something is wrong, tap Help on WhatsApp straight away.",
      "You can cancel while the order is Pending, and ask for a return within 7 days of delivery.",
    ],
    terms: [
      { term: "Pending", meaning: "Placed, not yet confirmed. You can still cancel it." },
      { term: "Shipped", meaning: "With the courier and on its way to you." },
      { term: "COD", meaning: "Cash on Delivery: pay the rider when it arrives." },
    ],
  },
  "/orders": {
    i18n: "help.orders",
    title: "My orders",
    summary: "Every order you've placed, with its status and details.",
    expect: [
      "Each order's items, total, delivery address and current status.",
      "You can cancel an order yourself while it's still Pending.",
      "Within 7 days of delivery you can ask for a return or exchange.",
    ],
    terms: [
      { term: "Pending", meaning: "Placed, not yet confirmed. You can still cancel it." },
      { term: "Shipped", meaning: "With the courier and on its way to you." },
      { term: "Delivered", meaning: "You've received it." },
      { term: "COD", meaning: "Cash on Delivery: pay the rider when it arrives." },
      { term: "Pre-order", meaning: "Sold before stock arrives; ships on the date shown." },
    ],
  },
  "/settings": {
    i18n: "help.settings",
    title: "Settings",
    summary: "Your profile, password, security and messages from the store.",
    expect: [
      "Change your name, phone number and delivery address.",
      "Change your password and turn on two-step verification.",
      "See every device signed in to your account and sign out any you don't recognise.",
      "Choose whether you get offers by email or SMS.",
    ],
    terms: [
      { term: "2FA", meaning: "Two-step verification: a 6-digit code from an authenticator app on top of your password." },
      { term: "Backup codes", meaning: "One-time codes (XXXXX-XXXXX) to sign in if you lose your phone. Keep them safe." },
      { term: "SMS", meaning: "Text message to your phone." },
      { term: "IP", meaning: "The internet address a device signed in from." },
    ],
  },
  "/admin/products": {
    title: "Manage products",
    summary: "Add, edit and remove the products in your shop.",
    expect: [
      "Search and filter by category, stock and delivery type.",
      "Edit a product's photos, price, stock, sizes/colours (variants), weight and pre-order settings.",
      "The history icon shows every stock change: sales, cancellations, returns and staff edits.",
      "A row warns when some variants are sold out or running low.",
    ],
    terms: [
      { term: "Variant", meaning: "One combination of options, e.g. Black / L, with its own price and stock." },
      { term: "SKU", meaning: "Stock Keeping Unit: your own code for a product or variant (optional)." },
      { term: "Delivery (in/out)", meaning: "Flat delivery fee inside / outside the store's city." },
      { term: "kg", meaning: "Shipping weight in kilograms. Sets the Pathao delivery fee." },
      { term: "Featured", meaning: "Shown on the homepage." },
      { term: "Pre-order", meaning: "Sold before stock arrives; no stock is taken until then." },
      { term: "Low stock", meaning: "5 or fewer units left (per variant)." },
    ],
  },
  "/admin/orders/[id]": {
    title: "Order details",
    summary: "One order from start to finish: what was ordered, who the customer is, and what to do next.",
    expect: [
      "The timeline shows each step. Green with a tick is done, the highlighted step is what to do next, grey is still to come.",
      "WhatsApp opens a chat with the customer with a ready message about the order. Call dials their number.",
      "Customer history counts every order from this account or phone number. A warning shows when they cancel often.",
      "Book with Pathao from the booking step; Refresh Pathao fetches the latest courier status.",
      "Cancelling puts the stock back automatically and tells the customer.",
    ],
    terms: ORDER_STATUS_TERMS,
  },
  "/admin/orders": {
    title: "Manage orders",
    summary: "Every order in the store, from the website and ones you record by phone.",
    expect: [
      "Filter by status, regular or pre-order, and sort by date or value.",
      "Open an order to change its status, add an internal note, or book Pathao delivery.",
      "Tick several orders to change their status at once.",
      "\"New order\" records a phone or walk-in order. Print makes a packing slip/invoice.",
      "Cancelling puts the stock back automatically.",
    ],
    terms: [
      ...ORDER_STATUS_TERMS,
      { term: "COD", meaning: "Cash on Delivery: the rider collects the money." },
      { term: "Pathao", meaning: "The courier company that delivers orders." },
      { term: "Consignment ID", meaning: "Pathao's tracking number for a parcel." },
      { term: "Manual", meaning: "An order staff recorded, not one placed on the website." },
      { term: "Qty", meaning: "Quantity." },
      { term: "#ABC123", meaning: "Short order number: the last 6 characters of the order ID." },
    ],
  },
  "/admin/returns": {
    title: "Returns & exchanges",
    summary: "Customer requests to return or exchange items, within 7 days of delivery.",
    expect: [
      "Approve or reject a request; the customer sees your message and gets an email.",
      "Mark items as received, and choose whether they go back into stock.",
      "Record the refund, or mark the exchange item as sent.",
      "You can also log a request a customer made by phone from Manage orders.",
    ],
    terms: [
      { term: "Requested", meaning: "Waiting for you to approve or reject." },
      { term: "Approved", meaning: "Accepted; waiting for the items to come back." },
      { term: "Received", meaning: "The items are back with you." },
      { term: "Completed", meaning: "Refunded or exchanged. Done." },
      { term: "Rejected", meaning: "Declined, with a reason shown to the customer." },
      { term: "Restock", meaning: "Put the returned units back into sellable stock." },
    ],
  },
  "/admin/payments": {
    title: "Payments",
    summary: "Money collected and refunded, and online payments that need checking.",
    expect: [
      "Totals for bKash and Cash on Delivery collected, refunds and net, for the date range you pick.",
      "Flagged and stuck bKash orders, with \"Re-check with bKash\" to ask bKash for the real result.",
      "Resolve a problem with a required note: mark paid, cancel, or close.",
    ],
    terms: [
      { term: "bKash", meaning: "Mobile wallet payment made online at checkout." },
      { term: "COD", meaning: "Cash on Delivery." },
      { term: "Net", meaning: "Money collected minus refunds." },
      { term: "TrxID", meaning: "Transaction ID: bKash's reference for a payment." },
      { term: "Stuck", meaning: "An online payment with no final result yet." },
    ],
  },
  "/admin/promotions": {
    title: "Promo codes",
    summary: "Discount codes customers type at checkout.",
    expect: [
      "Create a code as a percentage or a fixed amount off.",
      "Apply it to the whole store or one product, with an optional expiry date.",
      "Switch a code off without deleting it.",
      "A promo code and a pre-order discount don't add up; the bigger one is used.",
    ],
    terms: [
      { term: "%", meaning: "Percentage off the price." },
      { term: "Fixed", meaning: "A set amount of ৳ off." },
      { term: "Scope", meaning: "Where the code works: the whole store or one product." },
    ],
  },
  "/admin/categories": {
    title: "Manage categories",
    summary: "The list of categories products can be put in.",
    expect: [
      "Add a category with a name, an optional Bangla name and an optional photo.",
      "A category shows on the storefront only once it has at least one product.",
      "Use the arrows to change the order categories appear in.",
      "Renaming a category renames it on all its products. A category can be deleted only when it has no products.",
    ],
    terms: [
      { term: "Hidden", meaning: "The category has no products yet, so shoppers don't see it." },
    ],
  },
  "/admin/banners": {
    title: "Manage banners",
    summary: "The sliding banners at the top of the homepage.",
    expect: [
      "Add a slide with text, colours and buttons, and optionally link a promo code.",
      "Use the arrows to change the order slides appear in.",
      "Switch a slide off without deleting it.",
    ],
    terms: [
      { term: "Eyebrow", meaning: "The small line of text above the banner's main title." },
      { term: "CTA", meaning: "Call to action: a button such as \"Shop now\"." },
    ],
  },
  "/admin/analytics": {
    title: "Analytics",
    summary: "How the store is doing over time: visitors, orders and sales.",
    expect: [
      "Pick a range: today, 7 days, 30 days or all time.",
      "Visitors, page views, product clicks, where visitors came from, and top pages.",
      "Orders by status, revenue, products and users. Stock and user totals are always \"right now\".",
    ],
    terms: [
      { term: "Page views", meaning: "Every page opened, counting repeats." },
      { term: "Unique visitors", meaning: "Different people (browser sessions), each counted once." },
      { term: "Revenue", meaning: "Money from paid, shipped and delivered orders." },
      { term: "Referrer", meaning: "The site a visitor came from, e.g. Facebook." },
      { term: "7d / 30d", meaning: "The last 7 / 30 days." },
    ],
  },
  "/admin/ads": {
    title: "Social media ads",
    summary: "Make posts for Facebook and Instagram from a product or promo code, and keep a log of each.",
    expect: [
      "Create an ad from a product or promo code; the caption and link are filled in for you.",
      "Publish to each connected platform; each one's result is shown.",
      "Retry a single platform if it failed.",
    ],
    terms: [
      { term: "FB / IG", meaning: "Facebook / Instagram." },
      { term: "Caption", meaning: "The text posted with the image." },
      { term: "URL", meaning: "The web link the ad points to." },
    ],
  },
  "/admin/campaigns": {
    title: "Marketing campaigns",
    summary: "Send an email or SMS offer to customers who agreed to receive them.",
    expect: [
      "Build a campaign from a product or promo code.",
      "Write the email subject and text and/or the SMS message.",
      "Only customers who opted in get it. Sent campaigns are listed with how many received them.",
    ],
    terms: [
      { term: "SMS", meaning: "Text message to a phone. Needs an SMS account to be set up." },
      { term: "Opted in", meaning: "The customer said yes to offers in their Settings." },
      { term: "Recipients", meaning: "The people a campaign was sent to." },
    ],
  },
  "/admin/messages": {
    title: "Messages",
    summary: "Messages sent from the website's Contact page.",
    expect: [
      "Each message's name, email, subject and text.",
      "Mark messages read or unread to keep track of what's been handled.",
      "Reply opens your email app addressed to the customer.",
    ],
    terms: [],
  },
  "/admin/reviews": {
    title: "Reviews",
    summary: "Customer reviews of your products, and the store's public replies.",
    expect: [
      "Filter by \"Needs a reply\", \"Replied\" or all, and by star rating.",
      "Post one public reply per review; the customer gets an email the first time.",
      "Edit or remove your reply, or delete a review.",
    ],
    terms: [
      { term: "★", meaning: "Star rating from 1 (worst) to 5 (best)." },
      { term: "Verified purchase", meaning: "The reviewer actually bought the product." },
    ],
  },
  "/admin/translations": {
    title: "Translations",
    summary: "The Bangla text for every English word or sentence on the website.",
    expect: [
      "Search by key or English text.",
      "Edit the Bangla text; the website uses it straight away.",
      "Text without Bangla shows in English.",
    ],
    terms: [
      { term: "Key", meaning: "The internal name of a piece of text, e.g. nav.orders." },
      { term: "en / bn", meaning: "English / Bangla." },
    ],
  },
  "/admin/users": {
    title: "Manage users",
    summary: "Everyone with an account, and what staff are allowed to do.",
    expect: [
      "Search users by name or email.",
      "Make someone a co-admin and tick exactly which areas they can manage.",
      "Only a full admin can open this page.",
    ],
    terms: [
      { term: "Admin", meaning: "Full access to everything." },
      { term: "Co-admin", meaning: "Staff with only the permissions you tick." },
      { term: "User", meaning: "A normal customer account." },
      { term: "Permission", meaning: "One area a co-admin may manage, e.g. Manage orders." },
    ],
  },
  "/admin/audit-log": {
    title: "Change History",
    summary: "A record of every change staff made, with before and after values.",
    expect: [
      "Who changed what and when: products, orders, users, promo codes, banners and more.",
      "Filter by staff member, action and type of record. Only a full admin can open this page.",
      "Records can't be edited or deleted. Sign-ins aren't recorded.",
    ],
    terms: [
      { term: "Actor", meaning: "The staff member who made the change." },
      { term: "Before → after", meaning: "The value before and after the change." },
    ],
  },
};

// The help for a dashboard path, or null where there is none (checkout,
// the order print page). `/dashboard` differs for staff and customers.
export function helpForPath(pathname: string, isStaffDashboard: boolean): PageHelp | null {
  if (pathname === "/dashboard") return isStaffDashboard ? STAFF_DASHBOARD : CUSTOMER_DASHBOARD;
  if (/^\/orders\/[a-f0-9]{24}$/i.test(pathname)) return HELP["/orders/[id]"];
  if (/^\/admin\/orders\/[a-f0-9]{24}$/i.test(pathname)) return HELP["/admin/orders/[id]"];
  return HELP[pathname] ?? null;
}
