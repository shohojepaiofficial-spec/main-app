import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";

const mocks = vi.hoisted(() => ({
  Product: { findById: vi.fn() },
  ProductGalleryImage: { find: vi.fn(), findOne: vi.fn(), insertMany: vi.fn() },
  GalleryShare: { create: vi.fn(), findById: vi.fn() },
  store: vi.fn(),
  remove: vi.fn(),
  link: vi.fn(),
  fromLink: vi.fn(),
}));
vi.mock("../models/Product", () => ({ Product: mocks.Product }));
vi.mock("../models/ProductGalleryImage", () => ({ ProductGalleryImage: mocks.ProductGalleryImage }));
vi.mock("../models/GalleryShare", () => ({ GalleryShare: mocks.GalleryShare }));
vi.mock("../utils/upload", () => ({ storeUploadedFile: mocks.store, deleteUploadedFile: mocks.remove }));
vi.mock("../utils/galleryShareLinks", () => ({ galleryShareLink: mocks.link, shareIdFromGalleryShareLink: mocks.fromLink }));

import {
  uploadGalleryImages, listGalleryImages, updateGalleryImageTags, deleteGalleryImage, createGalleryShare, getGalleryShare,
} from "./productGalleryController";

const ID = "507f1f77bcf86cd799439011";
const IMAGE_ID = "507f1f77bcf86cd799439012";
function call(body: Record<string, unknown> = {}, extra: Partial<AuthRequest> = {}) {
  const req = { body, params: { id: ID }, query: {}, method: "POST", userId: "admin", ...extra } as unknown as AuthRequest;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res: res as unknown as Response, status: res.status, json: res.json };
}

beforeEach(() => { vi.resetAllMocks(); });

describe("uploading gallery images", () => {
  it("404s when the product doesn't exist", async () => {
    mocks.Product.findById.mockReturnValue({ select: () => Promise.resolve(null) });
    const { req, res, status } = call({}, { files: [{}] as unknown as Express.Multer.File[] });
    await uploadGalleryImages(req, res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("stores each file and saves comma-separated tags, lowercased and deduped", async () => {
    mocks.Product.findById.mockReturnValue({ select: () => Promise.resolve({ _id: ID }) });
    mocks.store.mockResolvedValueOnce("/uploads/a.webp").mockResolvedValueOnce("/uploads/b.webp");
    mocks.ProductGalleryImage.insertMany.mockResolvedValue([{ url: "/uploads/a.webp" }, { url: "/uploads/b.webp" }]);
    const files = [{}, {}] as unknown as Express.Multer.File[];
    const { req, res, status, json } = call({ tags: "Angle-2, Angle-2, Packaging" }, { files });
    await uploadGalleryImages(req, res);
    expect(mocks.store).toHaveBeenCalledTimes(2);
    expect(mocks.ProductGalleryImage.insertMany).toHaveBeenCalledWith([
      { product: ID, url: "/uploads/a.webp", tags: ["angle-2", "packaging"], uploadedBy: "admin" },
      { product: ID, url: "/uploads/b.webp", tags: ["angle-2", "packaging"], uploadedBy: "admin" },
    ]);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalled();
  });

  it("rejects an empty batch", async () => {
    mocks.Product.findById.mockReturnValue({ select: () => Promise.resolve({ _id: ID }) });
    const { req, res, status } = call({}, { files: [] });
    await uploadGalleryImages(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(mocks.store).not.toHaveBeenCalled();
  });
});

describe("listing gallery images", () => {
  it("filters by tag when given", async () => {
    const sort = vi.fn().mockResolvedValue([]);
    mocks.ProductGalleryImage.find.mockReturnValue({ sort });
    const { req, res } = call({}, { params: { id: ID }, query: { tag: " Packaging " }, method: "GET" });
    await listGalleryImages(req, res);
    expect(mocks.ProductGalleryImage.find).toHaveBeenCalledWith({ product: ID, tags: "packaging" });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});

describe("updating an image's tags", () => {
  it("404s when the image isn't this product's", async () => {
    mocks.ProductGalleryImage.findOne.mockResolvedValue(null);
    const { req, res, status } = call({ tags: ["x"] }, { params: { id: ID, imageId: IMAGE_ID }, method: "PATCH" });
    await updateGalleryImageTags(req, res);
    expect(mocks.ProductGalleryImage.findOne).toHaveBeenCalledWith({ _id: IMAGE_ID, product: ID });
    expect(status).toHaveBeenCalledWith(404);
  });

  it("saves the deduped tags", async () => {
    const save = vi.fn();
    const image = { tags: [], save };
    mocks.ProductGalleryImage.findOne.mockResolvedValue(image);
    const { req, res, json } = call({ tags: ["A", "a", "B"] }, { params: { id: ID, imageId: IMAGE_ID }, method: "PATCH" });
    await updateGalleryImageTags(req, res);
    expect(image.tags).toEqual(["a", "b"]);
    expect(save).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(image);
  });
});

describe("deleting a gallery image", () => {
  it("removes the stored file and the document", async () => {
    const deleteOne = vi.fn();
    mocks.ProductGalleryImage.findOne.mockResolvedValue({ url: "/uploads/a.webp", deleteOne });
    const { req, res, json } = call({}, { params: { id: ID, imageId: IMAGE_ID }, method: "DELETE", body: undefined });
    await deleteGalleryImage(req, res);
    expect(mocks.remove).toHaveBeenCalledWith("/uploads/a.webp");
    expect(deleteOne).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ message: "Deleted" });
  });
});

describe("creating a share link", () => {
  it("rejects an empty selection at the input-validation layer", async () => {
    const { req, res } = call({ imageIds: [] });
    await expect(createGalleryShare(req, res)).rejects.toMatchObject({ status: 400 });
    expect(mocks.GalleryShare.create).not.toHaveBeenCalled();
  });

  it("rejects images that don't belong to this product", async () => {
    mocks.ProductGalleryImage.find.mockResolvedValue([{ _id: IMAGE_ID }]);
    const { req, res, status } = call({ imageIds: [IMAGE_ID, "507f1f77bcf86cd799439013"] });
    await createGalleryShare(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(mocks.GalleryShare.create).not.toHaveBeenCalled();
  });

  it("creates the share and returns the signed link, never the bare id", async () => {
    mocks.ProductGalleryImage.find.mockResolvedValue([{ _id: IMAGE_ID }]);
    mocks.GalleryShare.create.mockResolvedValue({ id: "share1" });
    mocks.link.mockReturnValue("share1-sig");
    const { req, res, status, json } = call({ imageIds: [IMAGE_ID] });
    await createGalleryShare(req, res);
    expect(mocks.GalleryShare.create).toHaveBeenCalledWith({ product: ID, images: [IMAGE_ID], createdBy: "admin" });
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({ link: "share1-sig" });
  });
});

describe("getting a shared gallery (public)", () => {
  it("404s on an invalid link", async () => {
    mocks.fromLink.mockReturnValue(null);
    const { req, res, status } = call({}, { params: { link: "bogus" }, method: "GET" });
    await getGalleryShare(req, res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("404s on an expired share", async () => {
    mocks.fromLink.mockReturnValue("share1");
    mocks.GalleryShare.findById.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000) });
    const { req, res, status } = call({}, { params: { link: "share1-sig" }, method: "GET" });
    await getGalleryShare(req, res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("preserves selection order and drops since-deleted images", async () => {
    mocks.fromLink.mockReturnValue("share1");
    mocks.GalleryShare.findById.mockResolvedValue({
      expiresAt: new Date(Date.now() + 1000),
      product: ID,
      images: [{ toString: () => "img1" }, { toString: () => "img2" }],
    });
    mocks.Product.findById.mockReturnValue({ select: () => Promise.resolve({ name: "Nice Bag" }) });
    mocks.ProductGalleryImage.find.mockResolvedValue([{ id: "img2", url: "/uploads/b.webp", tags: ["x"] }]);
    const { req, res, json } = call({}, { params: { link: "share1-sig" }, method: "GET" });
    await getGalleryShare(req, res);
    expect(json).toHaveBeenCalledWith({
      productName: "Nice Bag",
      images: [{ id: "img2", url: "/uploads/b.webp", tags: ["x"] }],
    });
  });
});
