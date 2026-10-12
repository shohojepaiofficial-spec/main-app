import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";

const mocks = vi.hoisted(() => ({
  Category: { find: vi.fn(), findOne: vi.fn(), findById: vi.fn(), exists: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn(), updateOne: vi.fn() },
  Product: { aggregate: vi.fn(), updateMany: vi.fn(), countDocuments: vi.fn() },
  audit: vi.fn(),
  store: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../models/Category", () => ({ Category: mocks.Category }));
vi.mock("../models/Product", () => ({ Product: mocks.Product }));
vi.mock("../utils/auditLog", () => ({ recordAuditEvent: mocks.audit }));
vi.mock("../utils/upload", () => ({ storeUploadedFile: mocks.store, deleteUploadedFile: mocks.remove }));
vi.mock("mongoose", async (original) => {
  const actual = await original<typeof import("mongoose")>();
  const session = { withTransaction: (run: () => Promise<void>) => run(), endSession: vi.fn() };
  return { ...actual, default: { ...actual.default, startSession: vi.fn(async () => session) } };
});

import { createCategory, deleteCategory, getAllCategories, updateCategory } from "./categoryController";
import { getProductCategories } from "./productController";
import { ensureCategoriesFromProducts, resolveCategoryName } from "../utils/categories";

const ID = "507f1f77bcf86cd799439011";
const withSession = <T>(value: T) => ({ session: () => Promise.resolve(value) });
const doc = (fields: Record<string, unknown>) => ({ id: ID, _id: ID, nameBn: "", order: 0, ...fields, get: () => "t0", toObject: () => ({ _id: ID, ...fields }) });
function call(body: Record<string, unknown> = {}, extra: Partial<AuthRequest> = {}) {
  const req = { body, params: {}, method: "POST", userId: "admin", ...extra } as unknown as AuthRequest;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res: res as unknown as Response, status: res.status, json: res.json };
}
const groups = (...rows: [string, number][]) => rows.map(([label, count]) => ({ _id: label.toLowerCase(), label, count }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.Product.aggregate.mockResolvedValue([]);
});

describe("storefront category list", () => {
  it("hides categories with no products and keeps the staff order, photo and Bangla name", async () => {
    mocks.Product.aggregate.mockResolvedValue(groups(["shoes", 2], ["Bags", 1], ["Legacy", 4]));
    mocks.Category.find.mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([
      { key: "empty", name: "Empty", nameBn: "", order: 0 },
      { key: "bags", name: "Bags", nameBn: "ব্যাগ", image: "/uploads/bags.webp", order: 1 },
      { key: "shoes", name: "Shoes", nameBn: "", order: 2 },
    ]) }) });
    const { req, res, json } = call();
    await getProductCategories(req, res);
    expect(json).toHaveBeenCalledWith([
      { category: "Bags", count: 1, nameBn: "ব্যাগ", image: "/uploads/bags.webp" },
      { category: "Shoes", count: 2, nameBn: undefined, image: undefined },
      { category: "Legacy", count: 4 },
    ]);
  });
});

describe("staff category list", () => {
  it("includes empty categories with a zero count", async () => {
    mocks.Product.aggregate.mockResolvedValue(groups(["Shoes", 3]));
    mocks.Category.find.mockReturnValue({ sort: () => Promise.resolve([doc({ name: "Shoes", key: "shoes" }), doc({ name: "Empty", key: "empty" })]) });
    const { req, res, json } = call();
    await getAllCategories(req, res);
    expect(json.mock.calls[0][0].map((c: { name: string; productCount: number }) => [c.name, c.productCount])).toEqual([["Shoes", 3], ["Empty", 0]]);
  });
});

describe("creating a category", () => {
  it("rejects a name that already exists in any capitalisation", async () => {
    mocks.Category.exists.mockResolvedValue({ _id: ID });
    const { req, res, status } = call({ name: "  SHOES " });
    await createCategory(req, res);
    expect(mocks.Category.exists).toHaveBeenCalledWith({ key: "shoes" });
    expect(status).toHaveBeenCalledWith(409);
    expect(mocks.Category.create).not.toHaveBeenCalled();
  });
  it.each([{ name: "a" }, { name: "x".repeat(61) }, { name: "Shoes", nameBn: "x".repeat(61) }, {}])("rejects invalid names %#", async body => {
    const { req, res, status } = call(body);
    await createCategory(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });
  it("rejects unexpected fields", async () => {
    const { req, res } = call({ name: "Shoes", order: 5 });
    await expect(createCategory(req, res)).rejects.toMatchObject({ status: 400 });
  });
  it("stores the category after the last one and records it in the change history", async () => {
    mocks.Category.exists.mockResolvedValue(null);
    mocks.Category.findOne.mockReturnValue({ sort: () => withSession({ order: 4 }) });
    mocks.Category.create.mockImplementation(async ([fields]) => [doc(fields)]);
    const { req, res, status, json } = call({ name: " Shoes ", nameBn: "জুতা" });
    await createCategory(req, res);
    expect(mocks.Category.create.mock.calls[0][0][0]).toMatchObject({ name: "Shoes", key: "shoes", nameBn: "জুতা", order: 5 });
    expect(mocks.audit.mock.calls[0][0]).toMatchObject({ actorId: "admin", action: "created", entityType: "category", entityName: "Shoes" });
    expect(status).toHaveBeenCalledWith(201);
    expect(json.mock.calls[0][0]).toMatchObject({ name: "Shoes", productCount: 0 });
  });
});

describe("renaming a category", () => {
  it("renames its products and records the change", async () => {
    mocks.Category.findById.mockResolvedValue(doc({ name: "Shoes", key: "shoes" }));
    mocks.Category.exists.mockResolvedValue(null);
    mocks.Category.findOneAndUpdate.mockResolvedValue(doc({ name: "Footwear", key: "footwear" }));
    mocks.Product.countDocuments.mockReturnValue(withSession(2));
    const { req, res, json } = call({ name: "Footwear" }, { params: { id: ID }, method: "PUT" });
    await updateCategory(req, res);
    expect(mocks.Product.updateMany.mock.calls[0][0]).toEqual({ category: { $regex: "^Shoes$", $options: "i" } });
    expect(mocks.Product.updateMany.mock.calls[0][1]).toEqual({ $set: { category: "Footwear" } });
    expect(mocks.audit.mock.calls[0][0]).toMatchObject({ action: "updated", entityType: "category" });
    expect(json.mock.calls[0][0]).toMatchObject({ name: "Footwear", productCount: 2 });
  });
  it("refuses a name another category already has", async () => {
    mocks.Category.findById.mockResolvedValue(doc({ name: "Shoes", key: "shoes" }));
    mocks.Category.exists.mockResolvedValue({ _id: "other" });
    const { req, res, status } = call({ name: "Bags" }, { params: { id: ID }, method: "PUT" });
    await updateCategory(req, res);
    expect(status).toHaveBeenCalledWith(409);
    expect(mocks.Product.updateMany).not.toHaveBeenCalled();
  });
});

describe("deleting a category", () => {
  it("refuses while products are still in it", async () => {
    mocks.Category.findById.mockReturnValue(withSession(doc({ name: "Shoes", key: "shoes" })));
    mocks.Product.countDocuments.mockReturnValue(withSession(3));
    const { req, res, status } = call({}, { params: { id: ID }, method: "DELETE", body: undefined });
    await deleteCategory(req, res);
    expect(status).toHaveBeenCalledWith(409);
    expect(mocks.Category.findOneAndDelete).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("deletes an empty category, its image, and records it", async () => {
    const category = doc({ name: "Shoes", key: "shoes", image: "/uploads/shoes.webp" });
    mocks.Category.findById.mockReturnValue(withSession(category));
    mocks.Product.countDocuments.mockReturnValue(withSession(0));
    mocks.Category.findOneAndDelete.mockResolvedValue(category);
    const { req, res, json } = call({}, { params: { id: ID }, method: "DELETE", body: undefined });
    await deleteCategory(req, res);
    expect(mocks.audit.mock.calls[0][0]).toMatchObject({ action: "deleted", entityType: "category" });
    expect(json).toHaveBeenCalledWith({ message: "Category deleted" });
    expect(mocks.remove).toHaveBeenCalledWith("/uploads/shoes.webp");
  });
});

describe("category helpers", () => {
  it("resolves a product's category to the listed spelling", async () => {
    mocks.Category.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ name: "Shoes" }) }) });
    expect(await resolveCategoryName(" shoes ")).toBe("Shoes");
    expect(mocks.Category.findOne).toHaveBeenCalledWith({ key: "shoes" });
    expect(await resolveCategoryName("")).toBeNull();
    expect(await resolveCategoryName({ $ne: "" })).toBeNull();
  });
  it("adds list entries only for product categories that are missing", async () => {
    mocks.Product.aggregate.mockResolvedValue(groups(["Shoes", 2], ["Bags", 1]));
    mocks.Category.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ key: "shoes" }]) }) });
    mocks.Category.findOne.mockReturnValue({ sort: () => ({ select: () => ({ lean: () => Promise.resolve({ order: 2 }) }) }) });
    expect(await ensureCategoriesFromProducts()).toBe(1);
    expect(mocks.Category.updateOne).toHaveBeenCalledOnce();
    expect(mocks.Category.updateOne.mock.calls[0]).toEqual([{ key: "bags" }, { $setOnInsert: { name: "Bags", key: "bags", order: 3 } }, { upsert: true }]);
  });
});
