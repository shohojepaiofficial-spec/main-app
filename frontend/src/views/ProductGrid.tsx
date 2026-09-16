import { AppliedPromo, Product } from "@/models";
import { ProductCard } from "@/views/ProductCard";

interface ProductGridProps {
  products: Product[];
  promoByProductId?: Record<string, AppliedPromo>;
}

export function ProductGrid({ products, promoByProductId }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">No products found.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} promo={promoByProductId?.[product._id]} />
      ))}
    </div>
  );
}
