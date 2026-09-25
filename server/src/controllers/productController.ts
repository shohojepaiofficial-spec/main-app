import { Request, Response } from "express";
import { Product } from "../models/Product";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import { escapeRegex } from "../utils/regex";

const DEFAULT_PAGE_SIZE = 12;

// Same threshold the admin dashboard overview and analytics report use for
// "running low" — shared here too so the Manage Products stock filter means
// the same thing everywhere it appears.
const LOW_STOCK_THRESHOLD = 5;

export const getProducts = async (req: Request, res: Response) => {
  const { category, search, excludeId, featured, stockStatus, deliveryType, dateFrom, dateTo } = req.query as Record<
    string,
    string | undefined
  >;
  const filter: Record<string, unknown> = {};

  // `Product.category` is still free text (no separate Category collection —
  // see docs/PROGRESS.md), so "Shoes" and "shoes" are only the same category
  // if matching treats them that way.
  if (category) {
    filter.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };
  }
  if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };
  if (excludeId) filter._id = { $ne: excludeId };
  if (featured === "true") filter.isFeatured = true;

  if (stockStatus === "out_of_stock") {
    filter.stock = 0;
  } else if (stockStatus === "low_stock") {
    filter.stock = { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
  } else if (stockStatus === "in_stock") {
    filter.stock = { $gt: LOW_STOCK_THRESHOLD };
  }

  if (deliveryType === "free") {
    filter.deliveryFeeInsideCity = 0;
    filter.deliveryFeeOutsideCity = 0;
  } else if (deliveryType === "paid") {
    filter.$or = [{ deliveryFeeInsideCity: { $gt: 0 } }, { deliveryFeeOutsideCity: { $gt: 0 } }];
  }

  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      // Inclusive of the whole end day, not just midnight at its start.
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.$lte = end;
    }
    filter.createdAt = createdAt;
  }

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

// Lightweight, quick-glance numbers for the admin dashboard overview — this
// only needs products:manage, not analytics:manage, so a products-only
// coadmin still gets a useful home screen without the full analytics grant.
export const getProductStats = async (_req: Request, res: Response) => {
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
  const imagesChanging = existingImages !== undefined || newImages.length > 0;
  if (imagesChanging) {
    const kept: string[] = existingImages ? JSON.parse(existingImages) : [];
    update.images = [...kept, ...newImages];
  }

  // Read the old image list before it's overwritten — the only way to know
  // which URLs are being dropped, so they can be cleaned up from
  // Cloudinary/disk afterward instead of accumulating forever.
  const previousImages = imagesChanging
    ? ((await Product.findById(req.params.id).select("images"))?.images ?? [])
    : [];

  const product = await Product.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);

  // After responding: cleanup is maintenance, not something the client
  // should wait on. New images are already saved and the DB already points
  // at them, so only images that are no longer referenced anywhere in the
  // updated product get removed here.
  if (imagesChanging) {
    const stillUsed = new Set(product.images);
    const removed = previousImages.filter((img) => !stillUsed.has(img));
    await Promise.all(removed.map((img) => deleteUploadedFile(img)));
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product deleted" });

  await Promise.all(product.images.map((img) => deleteUploadedFile(img)));
};
