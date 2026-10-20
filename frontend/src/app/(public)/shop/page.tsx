import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { getProductCategories, getProducts } from "@/services/productService";
import { getActivePromoCodes } from "@/services/promoService";
import { ProductGrid } from "@/views/ProductGrid";
import { Pagination } from "@/views/Pagination";
import { PromoAutoApply } from "@/views/PromoAutoApply";
import { AppliedPromo } from "@/models";
import { T } from "@/components/ui/T";
import { matchShopCategory } from "@/lib/shopCategory";

type ShopSearchParams = { category?: string; page?: string; promo?: string };

// One categories request per render, shared by the metadata and the page.
const loadCategories = cache(getProductCategories);

// Only a real category is shown (see lib/shopCategory.ts); anything else is
// the plain shop.
async function resolveCategory(requested: string | undefined) {
  return requested ? matchShopCategory(requested, await loadCategories()) : undefined;
}

const parsePage = (value: string | undefined) => Math.max(1, parseInt(value ?? "1", 10) || 1);

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}): Promise<Metadata> {
  const { category: requested, page: pageParam } = await searchParams;
  const category = await resolveCategory(requested);
  const page = parsePage(pageParam);
  const title = category ? `${category} — Shop` : "Shop";
  const description = category
    ? `Browse our ${category} products.`
    : "Browse our full catalog of products.";
  const query = new URLSearchParams({ ...(category ? { category } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();

  return {
    title,
    description,
    // Unknown categories and ?promo= links all point search engines at the
    // real page, so they never index a URL someone made up.
    alternates: { canonical: query ? `/shop?${query}` : "/shop" },
    // Falls back to the site's default OG image (not inherited automatically
    // from layout.tsx — see the shop/[id] product page for why).
    openGraph: {
      title,
      description,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: { title, description, images: ["/og-image.png"] },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const { category: requested, page: pageParam, promo } = await searchParams;
  const page = parsePage(pageParam);
  const category = await resolveCategory(requested);
  const [{ items, totalPages }, activePromos] = await Promise.all([
    getProducts({ category, page }),
    getActivePromoCodes(),
  ]);

  const promoByProductId = activePromos.reduce<Record<string, AppliedPromo>>((map, p) => {
    if (p.scope === "product" && p.productId) map[p.productId] = p;
    return map;
  }, {});

  return (
    <main className="mx-auto max-w-7xl px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)]">
      <PromoAutoApply code={promo} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{category || <T k="nav.shop">Shop</T>}</h1>
        {category && (
          <Link href="/shop" className="text-sm text-muted underline">
            <T k="product.clearFilter">Clear filter</T>
          </Link>
        )}
      </div>
      <ProductGrid products={items} promoByProductId={promoByProductId} />
      <Pagination page={page} totalPages={totalPages} hrefBase="/shop" hrefParams={{ category }} />
    </main>
  );
}
