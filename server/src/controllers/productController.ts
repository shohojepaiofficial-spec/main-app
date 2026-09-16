import { Request, Response } from "express";
import { Product } from "../models/Product";
import { storeUploadedFile } from "../utils/upload";

const DEFAULT_PAGE_SIZE = 12;

// `Product.category` is still free text (no separate Category collection —
// see docs/PROGRESS.md), so "Shoes" and "shoes" are only the same category
// if matching treats them that way. Escaped so a category name containing
// regex-special characters (unlikely, but a bare "+" or "(" would otherwise
// throw) can't break the query.
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const getProducts = async (req: Request, res: Response) => {
  const { category, search, excludeId, featured } = req.query;
  const filter: Record<string, unknown> = {};

  if (category) {
    filter.category = { $regex: `^${escapeRegex(category as string)}$`, $options: "i" };
  }
  if (search) filter.name = { $regex: search as string, $options: "i" };
  if (excludeId) filter._id = { $ne: excludeId };
  if (featured === "true") filter.isFeatured = true;

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit as string, 10) || DEFAULT_PAGE_SIZE));

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
};

// Lightweight, quick-glance numbers for the admin dashboard overview — same
// low-stock threshold (<=5) as analyticsController's full report, but this
// only needs products:manage, not analytics:manage, so a products-only
// coadmin still gets a useful home screen without the full analytics grant.
export const getProductStats = async (_req: Request, res: Response) => {
  const LOW_STOCK_THRESHOLD = 5;
  const [totalProducts, lowStockCount, lowStockProducts] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ stock: { $lte: LOW_STOCK_THRESHOLD } }),
    Product.find({ stock: { $lte: LOW_STOCK_THRESHOLD } })
      .select("name stock")
      .sort({ stock: 1 })
      .limit(5),
  ]);

  res.json({ totalProducts, lowStockCount, lowStockProducts });
};

// Distinct categories with a product count each — backs the /categories page
// without pulling every product down just to count them client-side. Groups
// case-insensitively (lowercased key) so "Shoes" and "shoes" merge into one
// category instead of showing as two — the display label is whichever
// casing the oldest product in that group used, for a deterministic pick
// rather than whatever order Mongo happens to return documents in.
export const getProductCategories = async (_req: Request, res: Response) => {
  const categories = await Product.aggregate([
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: { $toLower: "$category" },
        label: { $first: "$category" },
        count: { $sum: 1 },
      },
    },
    { $sort: { label: 1 } },
  ]);
  res.json(categories.map((c) => ({ category: c.label as string, count: c.count as number })));
};

export const getProductById = async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
};

export const createProduct = async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const images = await Promise.all(files.map((file) => storeUploadedFile(file)));

  const product = await Product.create({ ...req.body, images });
  res.status(201).json(product);
};

export const updateProduct = async (req: Request, res: Response) => {
  // Edits arrive as multipart/form-data (to allow adding new image files
  // alongside text fields), so the client sends which existing images to
  // keep as a JSON-stringified array under `existingImages`, separate from
  // the `images` file field multer parses into req.files.
  const { existingImages, ...fields } = req.body;

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const newImages = await Promise.all(files.map((file) => storeUploadedFile(file)));

  const update: Record<string, unknown> = { ...fields };
  if (existingImages !== undefined || newImages.length > 0) {
    const kept: string[] = existingImages ? JSON.parse(existingImages) : [];
    update.images = [...kept, ...newImages];
  }

  const product = await Product.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
};

export const deleteProduct = async (req: Request, res: Response) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product deleted" });
};
