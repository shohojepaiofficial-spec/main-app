import { Response, Request } from "express";
import { Types } from "mongoose";
import { validateControllerInput } from "../middleware/controllerInput";
import { AuthRequest } from "../middleware/auth";
import { Product } from "../models/Product";
import { ProductGalleryImage } from "../models/ProductGalleryImage";
import { GalleryShare } from "../models/GalleryShare";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import { galleryShareLink, shareIdFromGalleryShareLink } from "../utils/galleryShareLinks";

function parseTags(raw: unknown): string[] {
  const list = typeof raw === "string" ? raw.split(",") : Array.isArray(raw) ? raw : [];
  const tags = list.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  return [...new Set(tags)];
}

// Staff-only — adds photos beyond the 5 featured Product.images, so a
// customer asking for a different angle can be shown one without digging
// through local folders/phones.
export const uploadGalleryImages = async (req: AuthRequest, res: Response) => {
  validateControllerInput("uploadGalleryImages", req);
  const product = await Product.findById(req.params.id).select("_id");
  if (!product) return res.status(404).json({ message: "Product not found" });

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) return res.status(400).json({ message: "No images provided" });
  const tags = parseTags(req.body?.tags);

  const urls = await Promise.all(files.map((file) => storeUploadedFile(file)));
  const created = await ProductGalleryImage.insertMany(
    urls.map((url) => ({ product: product._id, url, tags, uploadedBy: req.userId }))
  );
  res.status(201).json(created);
};

export const listGalleryImages = async (req: AuthRequest, res: Response) => {
  validateControllerInput("listGalleryImages", req);
  const filter: Record<string, unknown> = { product: req.params.id };
  const tag = typeof req.query.tag === "string" ? req.query.tag.trim().toLowerCase() : "";
  if (tag) filter.tags = tag;
  const images = await ProductGalleryImage.find(filter).sort({ createdAt: -1 });
  res.json(images);
};

export const updateGalleryImageTags = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateGalleryImageTags", req);
  const image = await ProductGalleryImage.findOne({ _id: req.params.imageId, product: req.params.id });
  if (!image) return res.status(404).json({ message: "Image not found" });
  image.tags = parseTags(req.body?.tags);
  await image.save();
  res.json(image);
};

export const deleteGalleryImage = async (req: AuthRequest, res: Response) => {
  validateControllerInput("deleteGalleryImage", req);
  const image = await ProductGalleryImage.findOne({ _id: req.params.imageId, product: req.params.id });
  if (!image) return res.status(404).json({ message: "Image not found" });
  await deleteUploadedFile(image.url);
  await image.deleteOne();
  res.json({ message: "Deleted" });
};

// Staff-only — bundles a multi-select into one signed link (never the bare
// id) that a teammate or customer can open without an account.
export const createGalleryShare = async (req: AuthRequest, res: Response) => {
  validateControllerInput("createGalleryShare", req);
  const imageIds: string[] = Array.isArray(req.body?.imageIds) ? req.body.imageIds : [];
  if (imageIds.length === 0 || !imageIds.every((id) => Types.ObjectId.isValid(id))) {
    return res.status(400).json({ message: "Select at least one image" });
  }
  const images = await ProductGalleryImage.find({ _id: { $in: imageIds }, product: req.params.id });
  if (images.length !== imageIds.length) {
    return res.status(400).json({ message: "One or more images don't belong to this product" });
  }

  const share = await GalleryShare.create({ product: req.params.id as string, images: imageIds as unknown as Types.ObjectId[], createdBy: req.userId });
  res.status(201).json({ link: galleryShareLink(share.id) });
};

const LINK_NOT_VALID = { message: "This link is no longer valid" };

// Public — whoever receives the link sees exactly the photos selected, no
// login, no price/order data.
export const getGalleryShare = async (req: Request, res: Response) => {
  validateControllerInput("getGalleryShare", req);
  const shareId = shareIdFromGalleryShareLink(req.params.link);
  if (!shareId) return res.status(404).json(LINK_NOT_VALID);
  const share = await GalleryShare.findById(shareId);
  if (!share || share.expiresAt <= new Date()) return res.status(404).json(LINK_NOT_VALID);

  const product = await Product.findById(share.product).select("name");
  const images = await ProductGalleryImage.find({ _id: { $in: share.images } });
  const imageById = new Map(images.map((img) => [img.id as string, img]));
  // Preserve selection order; an image deleted since the link was made is
  // silently dropped rather than erroring, same policy as getSharedCart.
  const ordered = share.images
    .map((id) => imageById.get(id.toString()))
    .filter((img): img is NonNullable<typeof img> => !!img)
    .map((img) => ({ id: img.id as string, url: img.url, tags: img.tags }));

  res.json({ productName: product?.name ?? "Product", images: ordered });
};
