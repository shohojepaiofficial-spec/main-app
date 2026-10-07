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
import { useTranslations } from "@/controllers/useTranslations";
import { useVariantPicker } from "@/controllers/useVariantPicker";
import { formatPriceRange, variantLabel } from "@/lib/variants";
import { VariantOptionPicker } from "@/views/VariantOptionPicker";
import { PreorderNotice } from "@/views/PreorderNotice";
import { isOnPreorder, preorderSpotsLeft, toCartPreorder } from "@/lib/preorder";

export function ProductBuyBox({
  product,
  promo,
  initialVariantId,
}: {
  product: Product;
  promo?: AppliedPromo;
  // From the page's ?variant= — a shared link to one specific variant.
  initialVariantId?: string;
}) {
  const [requestedQuantity, setQuantity] = useState(1);
  // Only turns on after a failed "Add to cart" with options still unpicked,
  // so the picker isn't covered in red before the shopper has done anything.
  const [showMissing, setShowMissing] = useState(false);
  const picker = useVariantPicker(product, initialVariantId);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const appliedPromo = useCartStore((s) => s.promo);
  const applyPromo = useCartStore((s) => s.applyPromo);
  const isPromoApplied = !!promo && appliedPromo?.code === promo.code;
  const { t } = useTranslations();

  // Until every option is picked there's no single stock number to show —
  // the product counts as buyable as long as any variant has stock, and the
  // buttons stay enabled so clicking them can point at what's missing.
  // A pre-order ignores stock (there is none yet) and is only limited by
  // its cap, if it has one.
  const needsPick = picker.hasVariants && !picker.variant;
  const onPreorder = isOnPreorder(product);
  const spotsLeft = preorderSpotsLeft(product);
  const inStock = onPreorder
    ? spotsLeft > 0 && !picker.isUnavailableCombination
    : needsPick
      ? product.stock > 0 && !picker.isUnavailableCombination
      : picker.stock > 0;
  const available = onPreorder ? spotsLeft : needsPick ? 10 : picker.stock;
  const maxQuantity = Math.max(1, Math.min(available, 10));
  // Switching to a variant with less stock can't leave the quantity above it.
  const quantity = Math.min(requestedQuantity, maxQuantity);

  // Returns false (and flags what's missing) when an option isn't picked yet.
  const addPickedToCart = () => {
    if (needsPick) {
      setShowMissing(true);
      return false;
    }
    addItem(
      {
        productId: product._id,
        variantId: picker.variant?._id,
        variantLabel: picker.variant ? variantLabel(picker.variant.selections) : undefined,
        name: product.name,
        price: picker.price,
        image: picker.image ? toUploadUrl(picker.image) : undefined,
        deliveryFeeInsideCity: product.deliveryFeeInsideCity,
        deliveryFeeOutsideCity: product.deliveryFeeOutsideCity,
        preorder: toCartPreorder(product),
      },
      quantity
    );
    return true;
  };

  const addToCart = () => {
    if (!addPickedToCart()) return;
    toast.success(
      onPreorder
        ? t("product.addedPreorderToCart", "Pre-order for {quantity} added to cart", { quantity })
        : t("product.addedToCart", "Added {quantity} to cart", { quantity })
    );
  };

  // "Buy Now" is the direct-order fast path — straight to checkout with
  // just this item, skipping the cart drawer.
  const buyNow = () => {
    if (!addPickedToCart()) return;
    router.push("/checkout");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* The price lives here rather than in the page itself so it can follow
          the picked variant — before a pick it's the range across variants. */}
      <p className="text-xl font-semibold">
        {picker.variant ? formatCurrency(picker.price) : formatPriceRange(product)}
      </p>

      {picker.hasVariants && <VariantOptionPicker picker={picker} showMissing={showMissing && needsPick} />}

      {promo && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-primary">
            <Tag size={14} className="shrink-0" />
            {t("product.promoWithCode", "{discount} with code {code}", {
              discount: formatPromoDiscount(promo),
              code: promo.code,
            })}
          </span>
          {isPromoApplied ? (
            <span className="text-xs text-muted">{t("common.applied", "Applied")}</span>
          ) : (
            <button
              onClick={() => {
                applyPromo(promo);
                toast.success(t("product.codeApplied", 'Code "{code}" applied', { code: promo.code }));
              }}
              className="shrink-0 text-xs font-medium text-primary underline hover:no-underline"
            >
              {t("common.apply", "Apply")}
            </button>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 text-sm text-muted">
        <Truck size={16} className="shrink-0 mt-0.5" />
        {product.deliveryFeeInsideCity === 0 && product.deliveryFeeOutsideCity === 0 ? (
          <span>{t("product.freeDelivery", "Free delivery")}</span>
        ) : (
          <span>
            {t("product.deliveryFeesBoth", "{insideFee} inside city · {outsideFee} outside city", {
              insideFee:
                product.deliveryFeeInsideCity > 0
                  ? formatCurrency(product.deliveryFeeInsideCity)
                  : t("common.free", "Free"),
              outsideFee:
                product.deliveryFeeOutsideCity > 0
                  ? formatCurrency(product.deliveryFeeOutsideCity)
                  : t("common.free", "Free"),
            })}
          </span>
        )}
      </div>

      {onPreorder && <PreorderNotice preorder={product.preorder!} spotsLeft={spotsLeft} />}

      <div>
        {onPreorder ? null : picker.isUnavailableCombination ? (
          <p className="text-sm font-medium text-red-600">
            {t("product.combinationUnavailable", "This combination isn't available — try another option")}
          </p>
        ) : needsPick && inStock ? null : inStock ? (
          <p className="text-sm font-medium text-green-700">
            {picker.stock <= 5
              ? t("product.inStockLimited", "In stock — only {count} left", { count: picker.stock })
              : t("product.inStock", "In stock")}
          </p>
        ) : (
          <p className="text-sm font-medium text-red-600">{t("product.outOfStock", "Out of stock")}</p>
        )}
      </div>

      {inStock && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{t("product.quantity", "Quantity")}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="rounded border border-border p-1.5 hover:bg-background"
              aria-label={t("product.decreaseQuantity", "Decrease quantity")}
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              className="rounded border border-border p-1.5 hover:bg-background"
              aria-label={t("product.increaseQuantity", "Increase quantity")}
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
          {t("product.addToCart", "Add to Cart")}
        </button>
        <button
          onClick={buyNow}
          disabled={!inStock}
          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {onPreorder ? t("product.preorderNow", "Pre-order now") : t("product.buyNow", "Buy Now")}
        </button>
        <WishlistButton
          productId={product._id}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:text-red-600"
        />
      </div>
    </div>
  );
}
