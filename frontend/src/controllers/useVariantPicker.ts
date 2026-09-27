"use client";

import { useState } from "react";
import { findVariant, hasVariants, isValueAvailable } from "@/lib/variants";
import type { Product } from "@/models";
import { useProductPreviewStore } from "./useProductPreviewStore";

// Picks for a product the shopper arrives at: the variant in the URL
// (?variant=…, a shared link) if there is one, otherwise just the options
// that only have one value (nothing to choose there).
function initialPicks(product: Product, initialVariantId?: string): Record<string, string> {
  const fromUrl = product.variants?.find((v) => v._id === initialVariantId);
  if (fromUrl) return Object.fromEntries(fromUrl.selections.map((s) => [s.name, s.value]));
  return Object.fromEntries(
    (product.options ?? []).filter((o) => o.values.length === 1).map((o) => [o.name, o.values[0]])
  );
}

// The product page's option-picking state: what's picked, which variant
// that resolves to, and what price/stock/image the buy box should show for
// it. For a simple product, `variant` is always undefined and everything
// falls back to the product itself.
export function useVariantPicker(product: Product, initialVariantId?: string) {
  const [picked, setPicked] = useState<Record<string, string>>(() => initialPicks(product, initialVariantId));
  const showImage = useProductPreviewStore((s) => s.showImage);

  const withVariants = hasVariants(product);
  const options = product.options ?? [];
  const variant = withVariants ? findVariant(product, picked) : undefined;
  const missingOptions = withVariants ? options.filter((o) => !picked[o.name]).map((o) => o.name) : [];
  // Every option picked, but the shop doesn't sell that combination at all
  // (e.g. no Grey in XXL) — different from "sold out".
  const isUnavailableCombination = withVariants && missingOptions.length === 0 && !variant;

  const pick = (optionName: string, value: string) => {
    const next = { ...picked, [optionName]: value };
    setPicked(next);

    const nextVariant = findVariant(product, next);

    // Keep the URL pointing at the chosen variant so the link can be shared
    // or bookmarked (the page reads ?variant= back on load). replaceState,
    // not pushState: each click shouldn't become a Back-button step.
    const url = new URL(window.location.href);
    if (nextVariant) url.searchParams.set("variant", nextVariant._id);
    else url.searchParams.delete("variant");
    window.history.replaceState(null, "", url);

    // A partial pick can already change the photo — picking "Black" shows
    // the black hoodie before a size is chosen.
    const previewImage =
      nextVariant?.image ??
      product.variants?.find(
        (v) => v.image && v.selections.every((s) => !next[s.name] || next[s.name] === s.value)
      )?.image ??
      null;
    showImage(product._id, previewImage);
  };

  return {
    hasVariants: withVariants,
    options,
    picked,
    pick,
    variant,
    missingOptions,
    isUnavailableCombination,
    isValueAvailable: (optionName: string, value: string) => isValueAvailable(product, picked, optionName, value),
    // What the buy box shows and adds to the cart.
    price: variant?.price ?? product.price,
    stock: withVariants ? (variant?.stock ?? 0) : product.stock,
    image: variant?.image ?? product.images[0],
  };
}

export type VariantPicker = ReturnType<typeof useVariantPicker>;
