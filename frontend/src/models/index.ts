// Delegable coadmin permissions. Admins implicitly hold every permission;
// plain users hold none. Keep in sync with server/src/utils/permissions.ts.
export const ALL_PERMISSIONS = [
  "products:manage",
  "orders:manage",
  "banners:manage",
  "promotions:manage",
  "analytics:manage",
  "ads:manage",
  "marketing:manage",
  "messages:manage",
  "reviews:manage",
] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "products:manage": "Manage products",
  "orders:manage": "Manage orders",
  "banners:manage": "Manage banners",
  "promotions:manage": "Manage promo codes",
  "analytics:manage": "View analytics",
  "ads:manage": "Manage social media ads",
  "marketing:manage": "Send email/SMS campaigns",
  "messages:manage": "Read contact messages",
  "reviews:manage": "Moderate product reviews",
};

export type UserRole = "user" | "coadmin" | "admin";
export type AuthProvider = "local" | "google" | "facebook";

export interface DeliveryLocation {
  // Zila (district) and Upazila (sub-district) are picked from a fixed list
  // (lib/bangladeshGeo.ts) via cascading selects — only the final
  // destination detail (house/road/area) is free text. See lib/delivery.ts
  // for how "inside/outside the store's city" gets derived from `zila`.
  zila: string;
  upazila: string;
  addressLine: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: Permission[];
  // Only OAuth ("google"/"facebook") accounts have no password to change —
  // see views/SettingsView.tsx.
  provider?: AuthProvider;
  image?: string | null;
  // Prefills the checkout form's contact field once set — see SettingsView.
  phone?: string;
  deliveryLocation?: DeliveryLocation;
  // OAuth accounts are always true (Google/Facebook already verified the
  // address); a local signup starts false until they click the emailed
  // link — see views/EmailVerificationBanner.tsx.
  isEmailVerified?: boolean;
  // Opt-in only (never on by default) — whether promotional campaigns may
  // reach this account by email/SMS. `sms` is meaningless without `phone`
  // set. See views/EmailVerificationBanner.tsx's sibling, the Settings
  // "Promotions" section, and the checkout page's SMS checkbox.
  marketingOptIn?: MarketingOptIn;
}

export interface MarketingOptIn {
  email: boolean;
  sms: boolean;
}

export interface ManagedUser extends User {
  provider: AuthProvider;
  createdAt: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  // Flat, admin-set per product — not computed from any courier's rates.
  deliveryFeeInsideCity: number;
  deliveryFeeOutsideCity: number;
  // Admin-picked for the homepage's "Featured" section — not computed.
  isFeatured: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductCategory {
  category: string;
  count: number;
}

export interface Review {
  _id: string;
  product: string;
  user: string;
  userName: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface ReviewList extends Paginated<Review> {
  average: number | null;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

// Only "cod" is actually processed today — see server's orderController and
// views/PaymentMethodPicker for the "coming soon" treatment of the rest.
export type PaymentMethod = "cod" | "bkash" | "nagad" | "card";

export interface OrderItem {
  // Populated (name/images/delivery fees) by GET /orders/my — null if the
  // product was since deleted, since a populate on a dangling ref resolves
  // to null.
  product: {
    _id: string;
    name: string;
    images: string[];
    deliveryFeeInsideCity: number;
    deliveryFeeOutsideCity: number;
  } | null;
  quantity: number;
  price: number;
}

// A lean product shape — what "reviewable products" and similar
// dashboard-only lists need, not the full Product.
export interface ProductSummary {
  _id: string;
  name: string;
  images: string[];
}

export interface ShippingDetails {
  fullName: string;
  phone: string;
  zila: string;
  upazila: string;
  addressLine: string;
}

// "manual" = an admin entered this on a phone/walk-in customer's behalf
// (see AdminOrdersView's "New order") — see server's Order model.
export type OrderSource = "online" | "manual";

export interface Order {
  _id: string;
  items: OrderItem[];
  itemsTotal: number;
  deliveryFee: number;
  promoCode?: string;
  discount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  // Only present on admin-fetched orders (getAllOrders/getOrderById) —
  // absent (or a raw id string) on the customer's own getMyOrders response,
  // which doesn't need it and doesn't populate it.
  source?: OrderSource;
  user?: { name: string; email: string } | null;
  shippingAddress: ShippingDetails;
  createdAt: string;
}

// Quick-glance admin dashboard numbers — see server's
// orderController#getOrderStats/productController#getProductStats. Kept
// separate from AnalyticsOverview (which needs analytics:manage) so an
// orders-only or products-only coadmin still gets a useful home screen.
export interface OrderStats {
  pendingCount: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface ProductStats {
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts: { _id: string; name: string; stock: number }[];
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DecodedToken {
  id: string;
  role: UserRole;
  exp: number;
  iat: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  // Captured at add-to-cart time, same as price/name/image — checkout sums
  // one flat fee per distinct product line (the tier depends on the
  // shipping zila chosen at checkout, not stored here).
  deliveryFeeInsideCity: number;
  deliveryFeeOutsideCity: number;
}

export interface SharedCartItem {
  productId: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  deliveryFeeInsideCity: number;
  deliveryFeeOutsideCity: number;
}

export interface SharedCart {
  id: string;
  items: SharedCartItem[];
  createdByName: string;
  isFulfilled: boolean;
}

export type Locale = "en" | "bn";

export type AuthModalMode = "login" | "signup" | "forgot";

export interface CtaLink {
  label: string;
  href: string;
}

export interface HeroSlide {
  id: string;
  image: string;
  eyebrow: string;
  accentColor: string;
  title: string;
  subtitle: string;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  // Only present when a linked promo code exists AND is still live — a
  // banner can point at a discount without one (e.g. a plain "New Arrivals"
  // slide), see server's getBanners.
  promo?: AppliedPromo;
}

// The admin's view of a banner: everything HeroSlide has, plus the fields
// only the dashboard needs (slide order, published/hidden, the raw linked
// promo code id for preselecting the form's dropdown). The public landing
// page only ever sees active banners shaped as plain HeroSlides — see
// services/bannerService.ts#getPublicBanners.
export interface ManagedBanner extends HeroSlide {
  order: number;
  isActive: boolean;
  promoCodeId?: string;
}

export type DiscountType = "percentage" | "flat";
export type PromoScope = "all" | "product";

export interface PromoCode {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
  scope: PromoScope;
  productId?: string;
  productName?: string;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

// What validating a code against the API hands back — just enough for the
// client to compute the discount itself against its own cart state.
export interface AppliedPromo {
  code: string;
  discountType: DiscountType;
  value: number;
  scope: PromoScope;
  productId?: string;
}

export type AnalyticsEventType = "page_view" | "product_click";

// Scopes orders/traffic/product-click data on the analytics dashboard —
// product/user totals stay "as of now" regardless of range. See server's
// utils/analyticsRange.ts.
export type AnalyticsRangePreset = "today" | "7d" | "30d" | "all";

export interface AnalyticsOverview {
  // The range actually applied server-side (falls back to "30d" if omitted
  // or invalid) — `from`/`to` are what "today"/"7d"/etc. resolved to, so the
  // dashboard can show the real window instead of just the preset's name.
  range: { preset: AnalyticsRangePreset; from: string | null; to: string };
  products: {
    total: number;
    totalStock: number;
    lowStockCount: number;
    byCategory: { category: string; count: number }[];
  };
  users: {
    total: number;
    byRole: { role: string; count: number }[];
    byProvider: { provider: string; count: number }[];
  };
  orders: {
    total: number;
    byStatus: { status: string; count: number }[];
    revenue: number;
  };
  traffic: {
    totalPageViews: number;
    uniqueVisitors: number;
    topRoutes: { path: string; count: number }[];
    // Each visitor session counted once, by whichever referrer their first
    // page view carried — "Facebook", "WhatsApp", etc., or "Direct / App" /
    // "Other websites" for anything else. See server's utils/referrer.ts.
    bySource: { source: string; count: number }[];
  };
  productClicks: {
    total: number;
    top: { productId: string; name: string; count: number }[];
  };
}

// What an ad's content was generated from — purely a badge in the admin
// list, doesn't change how publishing works. See views/AdminAdFormModal.tsx.
export type AdSourceType = "product" | "promotion" | "custom";

export type AdPlatform = "facebook" | "instagram" | "x";

// "not_connected" = that platform's API keys aren't set on the server yet —
// distinct from "failed" (keys are there, the API call itself was rejected)
// so the list can tell "you haven't set this up" apart from "something's
// wrong". See server's utils/... integrations/meta.ts and integrations/x.ts.
export type AdPlatformStatus = "pending" | "posted" | "failed" | "not_connected";

export interface AdPlatformResult {
  platform: AdPlatform;
  status: AdPlatformStatus;
  postedAt?: string;
  externalPostId?: string;
  errorMessage?: string;
}

export interface Ad {
  _id: string;
  title: string;
  sourceType: AdSourceType;
  product?: { _id: string; name: string } | null;
  promoCode?: { _id: string; code: string } | null;
  caption: string;
  image?: string;
  link?: string;
  platforms: AdPlatform[];
  results: AdPlatformResult[];
  createdAt: string;
}

// What a campaign's content was generated from — same idea as AdSourceType.
export type CampaignSourceType = "product" | "promotion" | "custom";
export type CampaignChannel = "email" | "sms";

export interface CampaignRecipientResult {
  user: string;
  name: string;
  channel: CampaignChannel;
  status: "sent" | "failed";
  error?: string;
}

export interface Campaign {
  _id: string;
  title: string;
  sourceType: CampaignSourceType;
  product?: { _id: string; name: string } | null;
  promoCode?: { _id: string; code: string } | null;
  channels: CampaignChannel[];
  emailSubject?: string;
  emailBody?: string;
  smsMessage?: string;
  // Snapshotted at send time, not live — see server's campaignController.
  stats: { recipientCount: number; sentCount: number; failedCount: number };
  recipients: CampaignRecipientResult[];
  createdAt: string;
}

export interface CampaignAudiencePreview {
  emailCount: number;
  smsCount: number;
  smsConfigured: boolean;
}
