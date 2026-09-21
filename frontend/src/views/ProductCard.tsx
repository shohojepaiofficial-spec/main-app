import Image from "next/image";
import Link from "next/link";
import { Tag } from "lucide-react";
import { AppliedPromo, Product } from "@/models";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatPromoDiscount } from "@/lib/promo";
import { WishlistButton } from "@/views/WishlistButton";
import { T } from "@/components/ui/T";

export function ProductCard({ product, promo }: { product: Product; promo?: AppliedPromo }) {
  const image = product.images[0];
  const lowestDeliveryFee = Math.min(product.deliveryFeeInsideCity, product.deliveryFeeOutsideCity);

  return (
    <Link
      href={`/shop/${product._id}`}
      className="block rounded-md border border-border bg-surface overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-background">
        {image ? (
          <Image
            src={toUploadUrl(image)}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            <T k="product.noImage">No image</T>
          </div>
        )}
        {product.stock === 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-medium uppercase text-background">
            <T k="product.outOfStock">Out of stock</T>
          </span>
        )}
        <WishlistButton productId={product._id} className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm hover:text-red-600" />
      </div>
      <div className="p-3">
        <p className="mb-1 text-xs text-muted">{product.category}</p>
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="mt-1 text-sm font-semibold">{formatCurrency(product.price)}</p>
        <p className="mt-0.5 text-xs text-muted">
          {lowestDeliveryFee > 0 ? (
            <T k="product.deliveryFrom" vars={{ fee: formatCurrency(lowestDeliveryFee) }}>
              {"From {fee} delivery"}
            </T>
          ) : (
            <T k="product.freeDelivery">Free delivery</T>
          )}
        </p>
        {promo && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
            <Tag size={11} className="shrink-0" />
            <T k="product.promoWithCode" vars={{ discount: formatPromoDiscount(promo), code: promo.code }}>
              {"{discount} with code {code}"}
            </T>
          </p>
        )}
      </div>
    </Link>
  );
}
