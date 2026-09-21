import Image from "next/image";
import Link from "next/link";
import { Product } from "@/models";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { T } from "@/components/ui/T";

export function ProductSuggestions({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <aside aria-labelledby="suggestions-heading">
      <h2 id="suggestions-heading" className="mb-3 text-sm font-semibold uppercase text-muted">
        <T k="product.youMightAlsoLike">You might also like</T>
      </h2>
      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <Link
            key={product._id}
            href={`/shop/${product._id}`}
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-2 hover:bg-background"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-background">
              {product.images[0] ? (
                <Image
                  src={toUploadUrl(product.images[0])}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-sm text-muted">{formatCurrency(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
