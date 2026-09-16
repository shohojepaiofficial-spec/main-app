import Link from "next/link";
import { Product } from "@/models";
import { ProductGrid } from "@/views/ProductGrid";

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
          <h2 className="text-2xl font-semibold">{isFallback ? "New Arrivals" : "Featured Products"}</h2>
          <p className="mt-1 text-sm text-muted">
            {isFallback ? "Fresh additions to the catalog." : "Hand-picked, just for you."}
          </p>
        </div>
        <Link href="/shop" className="text-sm text-muted hover:text-primary hover:underline">
          Shop all
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
