"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Minus, Plus, Truck, Tag } from "lucide-react";
import { useCartStore } from "@/controllers/useCartStore";
import { toUploadUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatPromoDiscount } from "@/lib/promo";
import { WishlistButton } from "@/views/WishlistButton";
import { AppliedPromo, Product } from "@/models";

export function ProductBuyBox({ product, promo }: { product: Product; promo?: AppliedPromo }) {
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const appliedPromo = useCartStore((s) => s.promo);
  const applyPromo = useCartStore((s) => s.applyPromo);
  const isPromoApplied = !!promo && appliedPromo?.code === promo.code;

  const inStock = product.stock > 0;
  const maxQuantity = Math.min(product.stock, 10);

  const cartItem = {
    productId: product._id,
    name: product.name,
    price: product.price,
    image: product.images[0] ? toUploadUrl(product.images[0]) : undefined,
    deliveryFeeInsideCity: product.deliveryFeeInsideCity,
    deliveryFeeOutsideCity: product.deliveryFeeOutsideCity,
  };

  const addToCart = () => {
    addItem(cartItem, quantity);
    toast.success(`Added ${quantity} to cart`);
  };

  // "Buy Now" is the direct-order fast path — straight to checkout with
  // just this item, skipping the cart drawer.
  const buyNow = () => {
    addItem(cartItem, quantity);
    router.push("/checkout");
  };

  return (
    <div className="flex flex-col gap-4">
      {promo && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-primary">
            <Tag size={14} className="shrink-0" />
            {formatPromoDiscount(promo)} with code {promo.code}
          </span>
          {isPromoApplied ? (
            <span className="text-xs text-muted">Applied</span>
          ) : (
            <button
              onClick={() => {
                applyPromo(promo);
                toast.success(`Code "${promo.code}" applied`);
              }}
              className="shrink-0 text-xs font-medium text-primary underline hover:no-underline"
            >
              Apply
            </button>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 text-sm text-muted">
        <Truck size={16} className="shrink-0 mt-0.5" />
        {product.deliveryFeeInsideCity === 0 && product.deliveryFeeOutsideCity === 0 ? (
          <span>Free delivery</span>
        ) : (
          <span>
            {product.deliveryFeeInsideCity > 0
              ? formatCurrency(product.deliveryFeeInsideCity)
              : "Free"}{" "}
            inside city &middot;{" "}
            {product.deliveryFeeOutsideCity > 0
              ? formatCurrency(product.deliveryFeeOutsideCity)
              : "Free"}{" "}
            outside city
          </span>
        )}
      </div>

      <div>
        {inStock ? (
          <p className="text-sm font-medium text-green-700">
            In stock{product.stock <= 5 ? ` — only ${product.stock} left` : ""}
          </p>
        ) : (
          <p className="text-sm font-medium text-red-600">Out of stock</p>
        )}
      </div>

      {inStock && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">Quantity</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="rounded border border-border p-1.5 hover:bg-background"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              className="rounded border border-border p-1.5 hover:bg-background"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={addToCart}
          disabled={!inStock}
          className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
        >
          Add to Cart
        </button>
        <button
          onClick={buyNow}
          disabled={!inStock}
          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          Buy Now
        </button>
        <WishlistButton
          productId={product._id}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:text-red-600"
        />
      </div>
    </div>
  );
}
