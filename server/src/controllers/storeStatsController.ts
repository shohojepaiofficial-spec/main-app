import { Request, Response } from "express";
import { Product } from "../models/Product";
import { Review } from "../models/Review";
import { Order } from "../models/Order";

// Public, storefront-safe numbers for the homepage's stats section — counts
// only, never money. Raw values: which ones are big enough to be worth
// showing is the frontend's call (see frontend/src/lib/storeStats.ts).
export interface StoreStats {
  productCount: number;
  categoryCount: number;
  reviewCount: number;
  averageRating: number | null;
  deliveredOrderCount: number;
  districtCount: number;
}

// The homepage is the most-visited page and these numbers barely move, so
// they're computed at most once every few minutes rather than on every
// render. Per-process, in memory — good enough for a single server.
const CACHE_MS = 5 * 60 * 1000;
let cached: { stats: StoreStats; at: number } | null = null;

async function computeStoreStats(): Promise<StoreStats> {
  const [productCount, categories, reviewSummary, deliveredOrderCount, districts] = await Promise.all([
    Product.countDocuments(),
    // Case-insensitive, same grouping as getProductCategories.
    Product.aggregate([{ $group: { _id: { $toLower: "$category" } } }, { $count: "n" }]),
    Review.aggregate([{ $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$rating" } } }]),
    Order.countDocuments({ status: "delivered" }),
    // Districts actually delivered to — a real number, not a coverage claim.
    Order.distinct("shippingAddress.zila", { status: "delivered" }),
  ]);

  return {
    productCount,
    categoryCount: categories[0]?.n ?? 0,
    reviewCount: reviewSummary[0]?.count ?? 0,
    averageRating: reviewSummary[0]?.average ?? null,
    deliveredOrderCount,
    districtCount: districts.length,
  };
}

export const getStoreStats = async (_req: Request, res: Response) => {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    cached = { stats: await computeStoreStats(), at: Date.now() };
  }
  res.json(cached.stats);
};
