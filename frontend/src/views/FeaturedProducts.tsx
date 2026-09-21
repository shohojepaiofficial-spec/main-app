import Link from "next/link";
import { Product } from "@/models";
import { ProductGrid } from "@/views/ProductGrid";
import { T } from "@/components/ui/T";

interface FeaturedProductsProps {
  products: Product[];
  // True when there were no admin-picked featured products and this is
  // showing the latest arrivals instead — see app/(public)/page.tsx.
  isFallback: boolean;
}

export function FeaturedProducts({ products, isFallback }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {isFallback ? (
              <T k="home.newArrivals.title">New Arrivals</T>
            ) : (
              <T k="home.featured.title">Featured Products</T>
            )}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isFallback ? (
              <T k="home.newArrivals.subtitle">Fresh additions to the catalog.</T>
            ) : (
              <T k="home.featured.subtitle">Hand-picked, just for you.</T>
            )}
          </p>
        </div>
        <Link href="/shop" className="text-sm text-muted hover:text-primary hover:underline">
          <T k="common.shopAll">Shop all</T>
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
