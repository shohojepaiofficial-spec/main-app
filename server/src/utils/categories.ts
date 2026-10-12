import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { escapeRegex } from "./regex";

// `Product.category` stays a plain name. The Category list is the set of
// names staff may pick from, plus each one's photo, Bangla name and order.
export const categoryKey = (name: string) => name.trim().toLowerCase();

// Products in a category, matched the same case-insensitive way everywhere.
export const productsInCategory = (name: string) => ({
  category: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
});

// The listed spelling of a category name, or null when it isn't on the list.
export async function resolveCategoryName(name: unknown): Promise<string | null> {
  if (typeof name !== "string" || !name.trim()) return null;
  const category = await Category.findOne({ key: categoryKey(name) }).select("name").lean();
  return category?.name ?? null;
}

// How many products each category has, keyed by lowercased name.
export async function productCountsByCategory(): Promise<Map<string, { label: string; count: number }>> {
  const groups = await Product.aggregate([
    { $sort: { createdAt: 1 } },
    { $group: { _id: { $toLower: "$category" }, label: { $first: "$category" }, count: { $sum: 1 } } },
  ]);
  return new Map(groups.map((g) => [(g._id as string).trim(), { label: g.label as string, count: g.count as number }]));
}

// Run at startup: adds a list entry for any category that products already
// use, so stores that predate the list keep every category they had.
export async function ensureCategoriesFromProducts() {
  const counts = await productCountsByCategory();
  if (counts.size === 0) return 0;
  const existing = new Set((await Category.find().select("key").lean()).map((c) => c.key));
  const missing = [...counts].filter(([key]) => key && !existing.has(key)).sort((a, b) => a[1].label.localeCompare(b[1].label));
  if (missing.length === 0) return 0;
  const highest = await Category.findOne().sort({ order: -1 }).select("order").lean();
  let order = (highest?.order ?? -1) + 1;
  for (const [key, { label }] of missing) {
    // upsert: two instances starting together must not create duplicates.
    await Category.updateOne({ key }, { $setOnInsert: { name: label.trim(), key, order: order++ } }, { upsert: true });
  }
  return missing.length;
}
