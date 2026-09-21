import type { Metadata } from "next";
import Link from "next/link";
import { getProducts } from "@/services/productService";
import { getActivePromoCodes } from "@/services/promoService";
import { ProductGrid } from "@/views/ProductGrid";
import { Pagination } from "@/views/Pagination";
import { PromoAutoApply } from "@/views/PromoAutoApply";
import { AppliedPromo } from "@/models";
import { T } from "@/components/ui/T";

type ShopSearchParams = { category?: string; page?: string; promo?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}): Promise<Metadata> {
  const { category } = await searchParams;
  return category
    ? { title: `${category} — Shop`, description: `Browse our ${category} products.` }
    : { title: "Shop", description: "Browse our full catalog of products." };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const { category, page: pageParam, promo } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
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
