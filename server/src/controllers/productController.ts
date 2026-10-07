import { Request, Response } from "express";
import { Product } from "../models/Product";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import { escapeRegex } from "../utils/regex";
import { normalizeVariantInput, presetOptionsForCategory, summarizeVariants } from "../utils/productVariants";
import { normalizePreorderInput, preorderUpdate } from "../utils/preorder";

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

// Builds the options/variants part of a create or update — and, for a
// product with variants, the derived top-level price/stock (see Product.ts).
// Returns an empty object when the request doesn't touch variants at all
// (an older client, or an edit that only changes other fields), so the
// stored ones are left alone.
function variantFields(body: Record<string, unknown>, finalImages: string[], newImages: string[]) {
  if (body.options === undefined && body.variants === undefined) return {};
  const { options, variants } = normalizeVariantInput(body.options, body.variants, finalImages, newImages);
  return variants.length > 0 ? { options, variants, ...summarizeVariants(variants) } : { options, variants };
}

export const createProduct = async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const images = await Promise.all(files.map((file) => storeUploadedFile(file)));

  const { options: _options, variants: _variants, preorder: rawPreorder, ...fields } = req.body;
  let variantData;
  let preorder;
  try {
    variantData = variantFields(req.body, images, images);
    preorder = rawPreorder === undefined ? undefined : { ...normalizePreorderInput(rawPreorder), reserved: 0 };
  } catch (err) {
    // Nothing references the just-uploaded images yet — don't leave them
    // orphaned in Cloudinary/on disk.
    await Promise.all(images.map((img) => deleteUploadedFile(img)));
    const { status, message } = err as { status?: number; message?: string };
    return res.status(status ?? 400).json({ message: message ?? "Invalid options" });
  }

  const product = await Product.create({ ...fields, images, ...variantData, ...(preorder ? { preorder } : {}) });
  res.status(201).json(product);
};

export const updateProduct = async (req: Request, res: Response) => {
  // Edits arrive as multipart/form-data (to allow adding new image files
  // alongside text fields), so the client sends which existing images to
  // keep as a JSON-stringified array under `existingImages`, separate from
  // the `images` file field multer parses into req.files.
  const { existingImages, options: _options, variants: _variants, preorder: rawPreorder, ...fields } = req.body;

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
  const current = await Product.findById(req.params.id).select("images preorder");
  if (!current) {
    await Promise.all(newImages.map((img) => deleteUploadedFile(img)));
    return res.status(404).json({ message: "Product not found" });
  }
  const previousImages = current.images;

  try {
    Object.assign(update, variantFields(req.body, (update.images as string[]) ?? previousImages, newImages));
    // Left out entirely by a client that doesn't send pre-order settings,
    // so the stored ones stay as they are.
    if (rawPreorder !== undefined) {
      const { $set, $unset } = preorderUpdate(normalizePreorderInput(rawPreorder), !!current.preorder?.enabled);
      Object.assign(update, $set);
      if (Object.keys($unset).length > 0) update.$unset = $unset;
    }
  } catch (err) {
    await Promise.all(newImages.map((img) => deleteUploadedFile(img)));
    const { status, message } = err as { status?: number; message?: string };
    return res.status(status ?? 400).json({ message: message ?? "Invalid options" });
  }

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

// Suggested options for the admin product form when a category is picked:
// whatever option names/values that category's existing products already
// use (so the second hoodie offers the same Size/Color the first one did),
// falling back to a keyword preset for a category with no products using
// options yet. Case-insensitive on category, same as getProducts' filter.
export const getOptionSuggestions = async (req: Request, res: Response) => {
  const { category } = req.query;
  if (typeof category !== "string" || !category.trim()) return res.json([]);

  const used = await Product.aggregate([
    { $match: { category: { $regex: `^${escapeRegex(category.trim())}$`, $options: "i" } } },
    // Oldest product first, and each value kept in the order the admin
    // entered it — so sizes come back S, M, L, XL rather than alphabetized.
    { $sort: { createdAt: 1 } },
    { $unwind: { path: "$options", includeArrayIndex: "position" } },
    {
      $group: {
        _id: { $toLower: "$options.name" },
        name: { $first: "$options.name" },
        position: { $min: "$position" },
        valueLists: { $push: "$options.values" },
      },
    },
    { $sort: { position: 1 } },
  ]);

  if (used.length === 0) return res.json(presetOptionsForCategory(category));

  res.json(
    used.map((option) => {
      const seen = new Set<string>();
      const values: string[] = [];
      for (const value of (option.valueLists as string[][]).flat()) {
        if (seen.has(value.toLowerCase())) continue;
        seen.add(value.toLowerCase());
        values.push(value);
      }
      return { name: option.name as string, values };
    })
  );
};
