import { HeroSlider } from "@/views/HeroSlider";
import { CategoryShowcase } from "@/views/CategoryShowcase";
import { FeaturedProducts } from "@/views/FeaturedProducts";
import { TrustBadges } from "@/views/TrustBadges";
import { FAQSection } from "@/views/FAQSection";
import { getPublicBanners } from "@/services/bannerService";
import { getProductCategories, getProducts } from "@/services/productService";
import { getStoreCity } from "@/services/configService";

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
      <HeroSlider slides={slides} />
      <CategoryShowcase categories={categories} />
      <FeaturedProducts products={featuredProducts} isFallback={isFallback} />
      <TrustBadges storeCity={storeCity} />
      <FAQSection storeCity={storeCity} />
    </main>
  );
}
