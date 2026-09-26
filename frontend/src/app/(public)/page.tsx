import { HeroSlider } from "@/views/HeroSlider";
import { CategoryShowcase } from "@/views/CategoryShowcase";
import { FeaturedProducts } from "@/views/FeaturedProducts";
import { TrustBadges } from "@/views/TrustBadges";
import { FAQSection } from "@/views/FAQSection";
import { getPublicBanners } from "@/services/bannerService";
import { getProductCategories, getProducts } from "@/services/productService";
import { getStoreCity } from "@/services/configService";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { CONTACT_PHONE_TEL, CONTACT_EMAIL } from "@/lib/contact";
import { toJsonLdScript } from "@/lib/jsonLd";

// Organization + WebSite JSON-LD (site identity, for a knowledge-panel /
// sitelinks-searchbox rich result — separate from ordinary indexing, which
// sitemap.ts/robots.ts already cover). Lives on the homepage, matching where
// FAQSection's own JSON-LD sits, rather than the root layout, since it's a
// once-per-site declaration, not per-page.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo-icon.png`,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: CONTACT_PHONE_TEL,
    email: CONTACT_EMAIL,
    contactType: "customer service",
    areaServed: "BD",
  },
  // Only Facebook is a real profile so far; Instagram/Twitter/YouTube in
  // Navbar.tsx/Footer.tsx's SOCIAL_LINKS are still placeholders
  // (https://instagram.com, etc.) — sameAs must link to genuine
  // authoritative profiles, so those stay out until they're real too.
  sameAs: ["https://www.facebook.com/profile.php?id=61594292297060"],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  // Deliberately no `potentialAction`/SearchAction: the site has no working
  // search endpoint to point one at, and a non-functional one would fail
  // rich-result validation (and just be wrong).
};

// No metadata export here on purpose: the root layout's default title/description
// already target "/" with the full branded copy. A page-level override would
// route through the `%s | ${SITE_NAME}` template instead, which reads worse
// on the homepage than anywhere else.
export default async function Home() {
  const [slides, categories, featuredResult, storeCity] = await Promise.all([
    getPublicBanners(),
    getProductCategories(),
    getProducts({ featured: true, limit: 8 }),
    getStoreCity(),
  ]);

  // Nothing marked featured yet (a fresh store) shouldn't mean an empty
  // section — fall back to the newest products instead.
  let featuredProducts = featuredResult.items;
  let isFallback = false;
  if (featuredProducts.length === 0) {
    const latest = await getProducts({ limit: 8 });
    featuredProducts = latest.items;
    isFallback = true;
  }

  return (
    <main className="pt-[var(--navbar-height)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(websiteJsonLd) }}
      />
      <HeroSlider slides={slides} />
      <CategoryShowcase categories={categories} />
      <FeaturedProducts products={featuredProducts} isFallback={isFallback} />
      <TrustBadges storeCity={storeCity} />
      <FAQSection storeCity={storeCity} />
    </main>
  );
}
