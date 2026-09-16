import { Response } from "express";
import { AnalyticsEvent } from "../models/AnalyticsEvent";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { classifyReferrer } from "../utils/referrer";
import { resolveAnalyticsRange } from "../utils/analyticsRange";
import { AuthRequest } from "../middleware/auth";

// Public (optionalAuth) — fires from every page load and every product
// detail view on the storefront. Never blocks the page: the frontend calls
// this fire-and-forget and swallows errors (see frontend's lib/analytics.ts).
export const trackEvent = async (req: AuthRequest, res: Response) => {
  const { type, path, productId, sessionId, referrer } = req.body as {
    type?: string;
    path?: string;
    productId?: string;
    sessionId?: string;
    referrer?: string;
  };

  if (type !== "page_view" && type !== "product_click") {
    return res.status(400).json({ message: "Invalid event type" });
  }
  if (!path || !sessionId) {
    return res.status(400).json({ message: "path and sessionId are required" });
  }

  await AnalyticsEvent.create({
    type,
    path,
    product: type === "product_click" ? productId : undefined,
    user: req.userId,
    sessionId,
    referrer: referrer || undefined,
  });

  res.status(201).json({ ok: true });
};

// Admin/coadmin (analytics:manage) — one consolidated payload rather than
// several endpoints, since the dashboard always wants all of it at once.
// `?range=today|7d|30d|all` (default "30d") scopes orders/traffic/clicks —
// the time-series-shaped data. Product/user totals are always "as of now"
// regardless of range; there's no meaningful "stock count for last 7 days".
export const getAnalyticsOverview = async (req: AuthRequest, res: Response) => {
  const { preset, since } = resolveAnalyticsRange(req.query.range);
  const dateFilter = since ? { createdAt: { $gte: since } } : {};

  const [
    totalProducts,
    totalStockAgg,
    lowStockCount,
    categoryBreakdown,
    totalUsers,
    usersByRole,
    usersByProvider,
    totalOrders,
    ordersByStatus,
    revenueAgg,
    totalPageViews,
    uniqueSessionIds,
    topRoutes,
    totalProductClicks,
    topClickedProductsAgg,
    firstReferrerPerSession,
  ] = await Promise.all([
    Product.countDocuments(),
    Product.aggregate([{ $group: { _id: null, total: { $sum: "$stock" } } }]),
    Product.countDocuments({ stock: { $lte: 5 } }),
    Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    User.countDocuments(),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: "$provider", count: { $sum: 1 } } }]),
    Order.countDocuments(dateFilter),
    Order.aggregate([{ $match: dateFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { ...dateFilter, status: { $in: ["paid", "shipped", "delivered"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    AnalyticsEvent.countDocuments({ type: "page_view", ...dateFilter }),
    AnalyticsEvent.distinct("sessionId", { type: "page_view", ...dateFilter }),
    AnalyticsEvent.aggregate([
      { $match: { type: "page_view", ...dateFilter } },
      { $group: { _id: "$path", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    AnalyticsEvent.countDocuments({ type: "product_click", ...dateFilter }),
    AnalyticsEvent.aggregate([
      { $match: { type: "product_click", product: { $ne: null }, ...dateFilter } },
      { $group: { _id: "$product", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    // One row per visitor session, carrying whichever referrer was present
    // on their *first* page_view within this range — see AnalyticsEvent's
    // `referrer` field.
    AnalyticsEvent.aggregate<{ _id: string; referrer?: string }>([
      { $match: { type: "page_view", ...dateFilter } },
      { $sort: { createdAt: 1 } },
      { $group: { _id: "$sessionId", referrer: { $first: "$referrer" } } },
    ]),
  ]);

  const sourceCounts = new Map<string, number>();
  for (const { referrer } of firstReferrerPerSession) {
    const label = classifyReferrer(referrer);
    sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
  }
  const bySource = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const clickedProductIds = topClickedProductsAgg.map((p) => p._id);
  const clickedProducts = await Product.find({ _id: { $in: clickedProductIds } }).select("name");
  const nameById = new Map(clickedProducts.map((p) => [p.id as string, p.name as string]));

  res.json({
    range: {
      preset,
      from: since ? since.toISOString() : null,
      to: new Date().toISOString(),
    },
    products: {
      total: totalProducts,
      totalStock: totalStockAgg[0]?.total ?? 0,
      lowStockCount,
      byCategory: categoryBreakdown.map((c) => ({ category: c._id as string, count: c.count as number })),
    },
    users: {
      total: totalUsers,
      byRole: usersByRole.map((r) => ({ role: r._id as string, count: r.count as number })),
      byProvider: usersByProvider.map((p) => ({
        provider: p._id as string,
        count: p.count as number,
      })),
    },
    orders: {
      total: totalOrders,
      byStatus: ordersByStatus.map((s) => ({ status: s._id as string, count: s.count as number })),
      revenue: revenueAgg[0]?.total ?? 0,
    },
    traffic: {
      totalPageViews,
      uniqueVisitors: uniqueSessionIds.length,
      topRoutes: topRoutes.map((r) => ({ path: r._id as string, count: r.count as number })),
      bySource,
    },
    productClicks: {
      total: totalProductClicks,
      top: topClickedProductsAgg.map((p) => ({
        productId: p._id?.toString(),
        name: nameById.get(p._id?.toString()) ?? "Deleted product",
        count: p.count as number,
      })),
    },
  });
};

// Shared by the count preview and the actual delete below, so what gets
// counted is always exactly what gets deleted — no separate logic to drift
// out of sync. `type` narrows to one event type ("page_view"/"product_click")
// or is omitted for both; `before` (an ISO date) narrows to events older
// than that cutoff, or is omitted to match everything, regardless of age.
function buildEventFilter(query: Record<string, unknown>) {
  const { type, before } = query as { type?: string; before?: string };
  const filter: Record<string, unknown> = {};

  if (type) {
    if (type !== "page_view" && type !== "product_click") {
      throw { status: 400, message: "Invalid event type" };
    }
    filter.type = type;
  }

  if (before) {
    const cutoff = new Date(before);
    if (Number.isNaN(cutoff.getTime())) {
      throw { status: 400, message: "Invalid 'before' date" };
    }
    filter.createdAt = { $lt: cutoff };
  }

  return filter;
}

// A dry-run preview — lets the admin see exactly how many events a filter
// matches before actually deleting anything, so the confirm dialog can show
// a real number instead of "are you sure?" in the abstract.
export const getAnalyticsEventCount = async (req: AuthRequest, res: Response) => {
  try {
    const filter = buildEventFilter(req.query);
    const count = await AnalyticsEvent.countDocuments(filter);
    res.json({ count });
  } catch (err) {
    const { status, message } = err as { status?: number; message?: string };
    res.status(status ?? 500).json({ message: message ?? "Failed to count events" });
  }
};

// Admin-only (not delegable to coadmins, even ones holding analytics:manage
// — see routes/analyticsRoutes.ts) — this permanently deletes real traffic
// history, which is a different order of consequence than just viewing it.
// Filtered by the same `type`/`before` query params as the count above, so
// "reset everything before today" (clearing out dev/test noise right
// before a real launch) doesn't have to mean losing genuine same-day data,
// and a specific event type can be cleared without touching the other.
export const resetAnalyticsEvents = async (req: AuthRequest, res: Response) => {
  try {
    const filter = buildEventFilter(req.query);
    const result = await AnalyticsEvent.deleteMany(filter);
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    const { status, message } = err as { status?: number; message?: string };
    res.status(status ?? 500).json({ message: message ?? "Failed to reset analytics" });
  }
};
