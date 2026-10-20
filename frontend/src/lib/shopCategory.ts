import type { ProductCategory } from "@/models";

// The shop's ?category= is whatever someone typed into the link, and it ends
// up in the page heading and the search-result title. Only a category the
// store actually has is used (spelled the store's way), so nobody can make
// shohojepai.com/shop?category=<any text> show their own words. Matching is
// case-insensitive, like the server's category filter.
export function matchShopCategory(requested: string | undefined, categories: ProductCategory[]): string | undefined {
  const wanted = requested?.trim().toLowerCase();
  if (!wanted) return undefined;
  return categories.find((c) => c.category.trim().toLowerCase() === wanted)?.category;
}
