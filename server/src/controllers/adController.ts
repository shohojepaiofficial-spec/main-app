import { Response } from "express";
import { Ad, AdPlatform, AdPlatformStatus, AdSourceType } from "../models/Ad";
import { Product } from "../models/Product";
import { PromoCode } from "../models/PromoCode";
import { AuthRequest } from "../middleware/auth";
import {
  isFacebookConfigured,
  isInstagramConfigured,
  postToFacebook,
  postToInstagram,
} from "../integrations/meta";
import { isXConfigured, postToX } from "../integrations/x";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import { isNonEmptyString } from "../utils/validate";

const ALL_PLATFORMS: AdPlatform[] = ["facebook", "instagram", "x"];

// Meta's servers fetch the image URL directly, so it has to be a real
// public https address, not localhost — see server/.env.example. (The
// destination `link` itself is sent ready-made by the frontend, same as
// other shareable links in this app — see lib/seo.ts's SITE_URL.)
const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;

function toPublicImageUrl(image?: string): string | undefined {
  if (!image) return undefined;
  return image.startsWith("http") ? image : `${SERVER_PUBLIC_URL}${image}`;
}

const shapeAd = (ad: InstanceType<typeof Ad>) => ({
  _id: ad.id,
  title: ad.title,
  sourceType: ad.sourceType,
  product: ad.product,
  promoCode: ad.promoCode,
  caption: ad.caption,
  image: ad.image,
  link: ad.link,
  platforms: ad.platforms,
  results: ad.results,
  createdAt: ad.createdAt,
});

export const getAds = async (_req: AuthRequest, res: Response) => {
  const ads = await Ad.find()
    .sort({ createdAt: -1 })
    .populate("product", "name")
    .populate("promoCode", "code");
  res.json(ads.map(shapeAd));
};

export const createAd = async (req: AuthRequest, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  const {
    title,
    sourceType,
    productId,
    promoCode: promoCodeInput,
    caption,
    link,
    platforms: platformsRaw,
  } = req.body as {
    title?: string;
    sourceType?: string;
    productId?: string;
    // The admin picks from the public "active promos" list, which only
    // exposes the code (not its internal id) — resolved to a real
    // `PromoCode` document below.
    promoCode?: string;
    caption?: string;
    link?: string;
    platforms?: string;
  };

  if (!title?.trim() || !caption?.trim()) {
    return res.status(400).json({ message: "Title and caption are required" });
  }
  if (sourceType !== "product" && sourceType !== "promotion" && sourceType !== "custom") {
    return res.status(400).json({ message: "Invalid source type" });
  }

  let platforms: AdPlatform[] = [];
  try {
    const parsed = JSON.parse(platformsRaw || "[]");
    if (!Array.isArray(parsed) || !parsed.every((p) => ALL_PLATFORMS.includes(p))) {
      throw new Error("invalid");
    }
    platforms = parsed;
  } catch {
    return res.status(400).json({ message: "Invalid platforms list" });
  }
  if (platforms.length === 0) {
    return res.status(400).json({ message: "Pick at least one platform" });
  }

  let promoDoc = null;
  if (sourceType === "promotion") {
    if (!isNonEmptyString(promoCodeInput)) {
      return res.status(400).json({ message: "Pick a promo code" });
    }
    promoDoc = await PromoCode.findOne({ code: promoCodeInput.trim().toUpperCase() });
    if (!promoDoc) return res.status(400).json({ message: "That promo code no longer exists" });
  }

  // Resolve the image: a freshly uploaded file wins, otherwise fall back to
  // the linked product's (or the promo's linked product's) first photo
  // rather than making the admin re-upload something already hosted.
  let image: string | undefined = file ? await storeUploadedFile(file) : undefined;
  if (!image && sourceType === "product" && productId) {
    const product = await Product.findById(productId).select("images");
    image = product?.images[0];
  } else if (!image && sourceType === "promotion" && promoDoc?.product) {
    const product = await Product.findById(promoDoc.product).select("images");
    image = product?.images[0];
  }

  if (platforms.includes("instagram") && !image) {
    return res.status(400).json({ message: "Instagram posts require an image" });
  }

  const ad = await Ad.create({
    title: title.trim(),
    sourceType: sourceType as AdSourceType,
    product: sourceType === "product" ? productId : undefined,
    promoCode: sourceType === "promotion" ? promoDoc?.id : undefined,
    caption: caption.trim(),
    image,
    ownsImage: !!file,
    link: link?.trim() || undefined,
    platforms,
    results: platforms.map((platform) => ({ platform, status: "pending" as AdPlatformStatus })),
    createdBy: req.userId,
  });

  res.status(201).json(shapeAd(ad));
};

// Attempts to (re-)post to each of the ad's platforms (or just the ones
// named in `platforms`, e.g. retrying only the one that failed). Never
// throws for a platform that isn't configured or that the API rejects —
// each attempt's outcome is recorded on the ad itself so the list always
// reflects reality, and one platform failing doesn't stop the others.
export const publishAd = async (req: AuthRequest, res: Response) => {
  const ad = await Ad.findById(req.params.id);
  if (!ad) return res.status(404).json({ message: "Ad not found" });

  const { platforms: requested } = req.body as { platforms?: AdPlatform[] };
  const targets = (requested?.length ? requested : ad.platforms).filter((p) =>
    ad.platforms.includes(p)
  );

  const imageUrl = toPublicImageUrl(ad.image);

  await Promise.all(
    targets.map(async (platform) => {
      let status: AdPlatformStatus;
      let externalPostId: string | undefined;
      let errorMessage: string | undefined;

      try {
        if (platform === "facebook") {
          if (!isFacebookConfigured()) throw { notConnected: true };
          externalPostId = await postToFacebook(ad.caption, imageUrl, ad.link);
        } else if (platform === "instagram") {
          if (!isInstagramConfigured()) throw { notConnected: true };
          if (!imageUrl) throw new Error("Instagram posts require an image");
          externalPostId = await postToInstagram(ad.caption, imageUrl, ad.link);
        } else {
          if (!isXConfigured()) throw { notConnected: true };
          const text = ad.link ? `${ad.caption}\n\n${ad.link}` : ad.caption;
          externalPostId = await postToX(text);
        }
        status = "posted";
      } catch (err) {
        if ((err as { notConnected?: boolean })?.notConnected) {
          status = "not_connected";
          errorMessage = "Not connected — add its API keys in the server's environment.";
        } else {
          status = "failed";
          errorMessage = (err as Error)?.message || "Failed to post";
        }
      }

      const existing = ad.results.find((r) => r.platform === platform);
      if (existing) {
        existing.status = status;
        existing.externalPostId = externalPostId;
        existing.errorMessage = errorMessage;
        existing.postedAt = status === "posted" ? new Date() : existing.postedAt;
      } else {
        ad.results.push({ platform, status, externalPostId, errorMessage, postedAt: status === "posted" ? new Date() : undefined });
      }
    })
  );

  await ad.save();
  res.json(shapeAd(ad));
};

// Only cleans up `ad.image` when `ownsImage` is set — an ad's image is
// often *borrowed* from a product (createAd above falls back to
// `product.images[0]` when nothing was uploaded specifically for the ad),
// and deleting that would delete an image a live product still depends on.
export const deleteAd = async (req: AuthRequest, res: Response) => {
  const ad = await Ad.findByIdAndDelete(req.params.id);
  if (!ad) return res.status(404).json({ message: "Ad not found" });
  if (ad.ownsImage) await deleteUploadedFile(ad.image);
  res.json({ message: "Ad deleted" });
};
