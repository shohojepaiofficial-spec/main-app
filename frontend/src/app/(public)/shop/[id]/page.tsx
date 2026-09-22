import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById, getProducts } from "@/services/productService";
import { getProductReviews } from "@/services/reviewService";
import { getActivePromoCodes } from "@/services/promoService";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { SITE_URL } from "@/lib/seo";
import { ProductGallery } from "@/views/ProductGallery";
import { ProductBuyBox } from "@/views/ProductBuyBox";
import { ProductReviews } from "@/views/ProductReviews";
import { ProductSuggestions } from "@/views/ProductSuggestions";
import { Breadcrumbs, BreadcrumbItem } from "@/views/Breadcrumbs";
import { PromoAutoApply } from "@/views/PromoAutoApply";
import { ProductClickTracker } from "@/views/ProductClickTracker";
import { T } from "@/components/ui/T";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Product not found" };

  const description = product.description.slice(0, 155);
  // Falls back to the site's default OG image (not `undefined`) so a
  // product with no photos yet still gets a real preview image instead of
  // silently losing the one the root layout would otherwise provide — see
  // layout.tsx's own openGraph.images for why that fallback can't just be
  // inherited automatically.
  const image = product.images[0] ? toUploadUrl(product.images[0]) : `${SITE_URL}/og-image.png`;

  return {
    title: product.name,
    description,
    openGraph: { title: product.name, description, images: [image] },
    twitter: { title: product.name, description, images: [image] },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ promo?: string }>;
}) {
  const { id } = await params;
  const { promo } = await searchParams;
  const product = await getProductById(id);
  if (!product) notFound();

  const [{ items: categoryMatches }, reviewSummary, activePromos] = await Promise.all([
    getProducts({ category: product.category, excludeId: product._id, limit: 4 }),
    getProductReviews(product._id, 1),
    getActivePromoCodes(),
  ]);

  // A code scoped to this exact product wins; otherwise fall back to a
  // sitewide code, since either would give this product a discount.
  const productPromo =
    activePromos.find((p) => p.scope === "product" && p.productId === product._id) ??
    activePromos.find((p) => p.scope === "all");

  // Backfill with other products when the category alone doesn't have enough
  // (e.g. a category with only this one product) — the suggestions section
  // should reliably show something rather than quietly disappearing.
  let suggestions = categoryMatches;
  if (suggestions.length < 4) {
    const { items: fallback } = await getProducts({ excludeId: product._id, limit: 8 });
    const existingIds = new Set(suggestions.map((p) => p._id));
    const extra = fallback
      .filter((p) => !existingIds.has(p._id))
      .slice(0, 4 - suggestions.length);
    suggestions = [...suggestions, ...extra];
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", key: "nav.home", href: "/" },
    { label: "Shop", key: "nav.shop", href: "/shop" },
    { label: product.category, href: `/shop?category=${encodeURIComponent(product.category)}` },
    { label: product.name },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map(toUploadUrl),
    category: product.category,
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "BDT",
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      // schema.org can express per-region shipping rates (shippingDestination
      // + DefinedRegion), but that needs real geographic data we don't have —
      // "inside vs. outside city" isn't a defined region. Using the inside-city
      // fee here as the representative rate keeps this valid without
      // fabricating one.
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: product.deliveryFeeInsideCity.toFixed(2),
          currency: "BDT",
        },
      },
    },
    ...(reviewSummary.average !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.average.toFixed(1),
            reviewCount: reviewSummary.total,
          },
        }
      : {}),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <PromoAutoApply code={promo} productId={product._id} />
      <ProductClickTracker
        productId={product._id}
        name={product.name}
        price={product.price}
        category={product.category}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <ProductGallery images={product.images} name={product.name} />

            <div className="flex flex-col gap-4">
              <div>
                <Link
                  href={`/shop?category=${encodeURIComponent(product.category)}`}
                  className="text-sm text-muted hover:text-primary hover:underline"
                >
                  {product.category}
                </Link>
                <h1 className="text-2xl font-semibold">{product.name}</h1>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(product.price)}</p>
              </div>

              <ProductBuyBox product={product} promo={productPromo} />

              <div>
                <h2 className="mb-1 text-sm font-semibold">
                  <T k="product.description">Description</T>
                </h2>
                <p className="text-sm text-muted whitespace-pre-line">{product.description}</p>
              </div>
            </div>
          </div>

          <ProductReviews productId={product._id} />
        </div>

        <ProductSuggestions products={suggestions} />
      </div>
    </main>
  );
}
