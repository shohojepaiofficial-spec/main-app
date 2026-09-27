import type { Product, ProductOption, ProductVariant, VariantSelection } from "@/models";
import { formatCurrency } from "./currency";

// Pure helpers for product options/variants, shared by the admin product
// form, the product page's option pickers, the cart and order views. See
// server/src/utils/productVariants.ts for the server's side of the same
// rules (which is what actually enforces them).

export function hasVariants(product: Pick<Product, "variants">): boolean {
  return (product.variants?.length ?? 0) > 0;
}

// "Black / L" — the same label the server snapshots onto order lines.
export function variantLabel(selections: VariantSelection[]): string {
  return selections.map((s) => s.value).join(" / ");
}

// Order-independent, case-insensitive identity for a combination — two
// selection lists naming the same values are the same variant.
export function combinationKey(selections: VariantSelection[]): string {
  return selections
    .map((s) => `${s.name.toLowerCase()}=${s.value.toLowerCase()}`)
    .sort()
    .join("|");
}

// Every combination of the options' values, in option order — the rows the
// admin form offers for a product's variants.
export function allCombinations(options: ProductOption[]): VariantSelection[][] {
  const usable = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (usable.length === 0) return [];
  return usable.reduce<VariantSelection[][]>(
    (combos, option) => combos.flatMap((combo) => option.values.map((value) => [...combo, { name: option.name, value }])),
    [[]]
  );
}

// The variant matching a (possibly partial) set of picks — only returns one
// once every option has a value picked.
export function findVariant(
  product: Pick<Product, "options" | "variants">,
  picked: Record<string, string>
): ProductVariant | undefined {
  const options = product.options ?? [];
  if (options.some((o) => !picked[o.name])) return undefined;
  const key = combinationKey(options.map((o) => ({ name: o.name, value: picked[o.name] })));
  return product.variants?.find((v) => combinationKey(v.selections) === key);
}

// Whether any in-stock variant is still reachable with `value` for `optionName`
// given the customer's other picks — drives greying out a Size that's sold
// out in the Color they already chose.
export function isValueAvailable(
  product: Pick<Product, "variants">,
  picked: Record<string, string>,
  optionName: string,
  value: string
): boolean {
  return (product.variants ?? []).some(
    (v) =>
      v.stock > 0 &&
      v.selections.every((s) =>
        s.name === optionName ? s.value === value : !picked[s.name] || picked[s.name] === s.value
      )
  );
}

// Lowest and highest variant price — equal for a simple product.
export function priceRange(product: Pick<Product, "price" | "variants">): { min: number; max: number } {
  if (!hasVariants(product)) return { min: product.price, max: product.price };
  const prices = product.variants!.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

// "৳800.00 – ৳1,200.00" for variants that differ in price, a single price
// otherwise.
export function formatPriceRange(product: Pick<Product, "price" | "variants">): string {
  const { min, max } = priceRange(product);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}
