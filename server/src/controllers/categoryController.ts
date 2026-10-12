import { Response } from "express";
import mongoose from "mongoose";
import { validateControllerInput } from "../middleware/controllerInput";
import { AuthRequest } from "../middleware/auth";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import { recordAuditEvent } from "../utils/auditLog";
import { categoryKey, productCountsByCategory, productsInCategory } from "../utils/categories";

type CategoryDoc = InstanceType<typeof Category>;

const shapeCategory = (category: CategoryDoc, productCount: number) => ({
  id: category.id,
  name: category.name,
  nameBn: category.nameBn,
  image: category.image,
  order: category.order,
  productCount,
});

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;
const duplicate = (res: Response) => res.status(409).json({ message: "A category with this name already exists" });

// Trimmed name/nameBn from a multipart body, or an error message.
function parseNames(body: { name?: unknown; nameBn?: unknown }) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const nameBn = typeof body.nameBn === "string" ? body.nameBn.trim() : "";
  if (name.length < 2 || name.length > 60) return { error: "Name must be 2 to 60 characters" };
  if (nameBn.length > 60) return { error: "Bangla name must be 60 characters or fewer" };
  return { name, nameBn };
}

// Staff (products:manage) — every category, including ones with no products
// yet. The storefront reads GET /api/products/categories instead, which
// only returns categories that have a product.
export const getAllCategories = async (_req: AuthRequest, res: Response) => {
  const [categories, counts] = await Promise.all([Category.find().sort({ order: 1, _id: 1 }), productCountsByCategory()]);
  res.json(categories.map((category) => shapeCategory(category, counts.get(category.key)?.count ?? 0)));
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  validateControllerInput("createCategory", req);
  const names = parseNames(req.body);
  if ("error" in names) return res.status(400).json({ message: names.error });
  const key = categoryKey(names.name);
  if (await Category.exists({ key })) return duplicate(res);

  const file = req.file as Express.Multer.File | undefined;
  const image = file ? await storeUploadedFile(file) : undefined;
  const session = await mongoose.startSession();
  const result: { category?: CategoryDoc } = {};
  try {
    await session.withTransaction(async () => {
      const highest = await Category.findOne().sort({ order: -1 }).session(session);
      const [created] = await Category.create([{ ...names, key, image, order: (highest?.order ?? -1) + 1 }], { session });
      await recordAuditEvent({
        actorId: req.userId!, action: "created", entityType: "category",
        entityId: created.id, entityName: created.name, after: created.toObject(),
      }, session);
      result.category = created;
    });
  } catch (error) {
    if (image) await deleteUploadedFile(image);
    if (isDuplicateKey(error)) return duplicate(res);
    throw error;
  } finally {
    await session.endSession();
  }
  if (!result.category) throw new Error("Category creation did not complete");
  res.status(201).json(shapeCategory(result.category, 0));
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateCategory", req);
  const names = parseNames(req.body);
  if ("error" in names) return res.status(400).json({ message: names.error });
  const current = await Category.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Category not found" });
  const key = categoryKey(names.name);
  if (key !== current.key && (await Category.exists({ key }))) return duplicate(res);

  // Same order as bannerController#updateBanner: store the new image first,
  // delete the old one only after the save has succeeded.
  const file = req.file as Express.Multer.File | undefined;
  const uploadedImage = file ? await storeUploadedFile(file) : undefined;
  const removeImage = !file && req.body.removeImage === "true";
  const update = uploadedImage
    ? { $set: { ...names, key, image: uploadedImage } }
    : removeImage
      ? { $set: { ...names, key }, $unset: { image: 1 } }
      : { $set: { ...names, key } };

  const session = await mongoose.startSession();
  const result: { category: CategoryDoc | null; productCount: number } = { category: null, productCount: 0 };
  let concurrentEdit = false;
  try {
    await session.withTransaction(async () => {
      const updated = await Category.findOneAndUpdate(
        { _id: current._id, updatedAt: current.get("updatedAt") },
        update,
        { session, returnDocument: "after", runValidators: true }
      );
      if (!updated) {
        concurrentEdit = true;
        return;
      }
      // Products store the category name, so a rename (or a change of
      // capital letters) is written to every product in it.
      if (updated.name !== current.name) {
        await Product.updateMany(productsInCategory(current.name), { $set: { category: updated.name } }, { session });
      }
      result.productCount = await Product.countDocuments(productsInCategory(updated.name)).session(session);
      await recordAuditEvent({
        actorId: req.userId!, action: "updated", entityType: "category",
        entityId: updated.id, entityName: updated.name,
        before: current.toObject(), after: updated.toObject(),
      }, session);
      result.category = updated;
    });
  } catch (error) {
    if (uploadedImage) await deleteUploadedFile(uploadedImage);
    if (isDuplicateKey(error)) return duplicate(res);
    throw error;
  } finally {
    await session.endSession();
  }
  if (concurrentEdit || !result.category) {
    if (uploadedImage) await deleteUploadedFile(uploadedImage);
    return res.status(409).json({ message: "Category changed; refresh and try again" });
  }
  res.json(shapeCategory(result.category, result.productCount));

  if (current.image && (uploadedImage || removeImage)) await deleteUploadedFile(current.image);
};

export const moveCategory = async (req: AuthRequest, res: Response) => {
  validateControllerInput("moveCategory", req);
  const { direction } = req.body as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({ message: "direction must be 'up' or 'down'" });
  }

  const session = await mongoose.startSession();
  const reordered: { categories: CategoryDoc[] | null } = { categories: null };
  let missing = false;
  let boundary = false;
  try {
    await session.withTransaction(async () => {
      const categories = await Category.find().sort({ order: 1, _id: 1 }).session(session);
      const index = categories.findIndex((category) => category.id === req.params.id);
      if (index === -1) {
        missing = true;
        return;
      }
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= categories.length) {
        boundary = true;
        return;
      }
      // Renumber the whole list so two categories that ended up with the
      // same order (possible after the startup sync) still swap cleanly.
      const before = categories.map((category) => category.toObject());
      [categories[index], categories[swapIndex]] = [categories[swapIndex], categories[index]];
      for (const [position, category] of categories.entries()) {
        if (category.order === position) continue;
        category.order = position;
        await category.save({ session });
        await recordAuditEvent({
          actorId: req.userId!, action: "reordered", entityType: "category",
          entityId: category.id, entityName: category.name,
          before: before.find((item) => String(item._id) === category.id), after: category.toObject(),
        }, session);
      }
      reordered.categories = categories;
    });
  } finally {
    await session.endSession();
  }
  if (missing) return res.status(404).json({ message: "Category not found" });
  if (boundary) return res.status(400).json({ message: "Can't move further in that direction" });
  if (!reordered.categories) throw new Error("Category reorder did not complete");
  const counts = await productCountsByCategory();
  res.json(reordered.categories.map((category) => shapeCategory(category, counts.get(category.key)?.count ?? 0)));
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  validateControllerInput("deleteCategory", req);
  const session = await mongoose.startSession();
  const result: { category: CategoryDoc | null } = { category: null };
  let missing = false;
  let inUse = 0;
  try {
    await session.withTransaction(async () => {
      const current = await Category.findById(req.params.id).session(session);
      if (!current) {
        missing = true;
        return;
      }
      inUse = await Product.countDocuments(productsInCategory(current.name)).session(session);
      if (inUse > 0) return;
      await recordAuditEvent({
        actorId: req.userId!, action: "deleted", entityType: "category",
        entityId: current.id, entityName: current.name, before: current.toObject(),
      }, session);
      result.category = await Category.findOneAndDelete({ _id: current._id }, { session });
    });
  } finally {
    await session.endSession();
  }
  if (missing) return res.status(404).json({ message: "Category not found" });
  if (inUse > 0) {
    return res.status(409).json({ message: `${inUse} product${inUse === 1 ? " is" : "s are"} in this category. Move or delete them first.` });
  }
  if (!result.category) throw new Error("Category deletion did not complete");
  res.json({ message: "Category deleted" });

  if (result.category.image) await deleteUploadedFile(result.category.image);
};
