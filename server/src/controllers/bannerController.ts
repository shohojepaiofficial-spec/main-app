import { validateControllerInput } from "../middleware/controllerInput";
import { Response, Request } from "express";
import { Banner, CtaLink } from "../models/Banner";
import { PromoCode, IPromoCode } from "../models/PromoCode";
import { AuthRequest } from "../middleware/auth";
import { storeUploadedFile, deleteUploadedFile } from "../utils/upload";
import mongoose from "mongoose";
import { recordAuditEvent } from "../utils/auditLog";

// Matches a product id out of a CTA href like "/shop/<id>" or
// "https://site.com/shop/<id>?promo=X" — how a banner "points at" a product.
const extractProductId = (href?: string) => href?.match(/\/shop\/([a-f0-9]{24})/i)?.[1];

const shapeBanner = (banner: InstanceType<typeof Banner>) => ({
  id: banner.id,
  image: banner.image,
  eyebrow: banner.eyebrow,
  accentColor: banner.accentColor,
  title: banner.title,
  subtitle: banner.subtitle,
  primaryCta: banner.primaryCta,
  secondaryCta: banner.secondaryCta,
  order: banner.order,
  isActive: banner.isActive,
  promoCodeId: banner.promoCode?.toString(),
});

// Public — feeds the landing page slider, active banners only. Shows a
// banner's discount two ways: an explicitly linked promo code, or — with no
// extra setup — one inferred from a CTA that points straight at a promoted
// product's page. Either way, only a code that's still actually
// active/unexpired counts; a banner whose (linked or inferred) code lapsed
// just falls back to a plain CTA rather than advertise a dead discount.
export const getBanners = async (_req: Request, res: Response) => {
  const banners = await Banner.find({ isActive: true })
    .sort({ order: 1 })
    .populate<{ promoCode?: IPromoCode }>("promoCode");
  const now = Date.now();

  const activeProductPromos = await PromoCode.find({
    scope: "product",
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date(now) } }],
  });
  const promoByProductId = new Map(
    activeProductPromos.filter((p) => p.product).map((p) => [p.product!.toString(), p])
  );

  res.json(
    banners.map((banner) => {
      const linked = banner.promoCode;
      const isLinkedLive =
        !!linked && linked.isActive && (!linked.expiresAt || linked.expiresAt.getTime() > now);

      const inferredProductId =
        extractProductId(banner.primaryCta.href) ?? extractProductId(banner.secondaryCta?.href);
      const promo: IPromoCode | undefined = isLinkedLive
        ? linked
        : inferredProductId
          ? promoByProductId.get(inferredProductId)
          : undefined;

      return {
        id: banner.id,
        image: banner.image,
        eyebrow: banner.eyebrow,
        accentColor: banner.accentColor,
        title: banner.title,
        subtitle: banner.subtitle,
        primaryCta: banner.primaryCta,
        secondaryCta: banner.secondaryCta,
        promo: promo
          ? {
              code: promo.code,
              discountType: promo.discountType,
              value: promo.value,
              scope: promo.scope,
              productId: promo.product?.toString(),
            }
          : undefined,
      };
    })
  );
};

// Admin/coadmin (banners:manage) — every banner, including inactive ones.
export const getAllBanners = async (_req: AuthRequest, res: Response) => {
  const banners = await Banner.find().sort({ order: 1 });
  res.json(banners.map(shapeBanner));
};

// Banners show on the home page to every visitor, so a button link may only
// be a page on this site ("/shop") or an https address — never
// "javascript:", "data:" or a protocol-relative "//elsewhere" (SEC-24).
export function isSafeBannerHref(href: string): boolean {
  if (href.length > 500) return false;
  if (href.startsWith("/")) return !href.startsWith("//") && !href.startsWith("/\\");
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

// Used inside CSS gradients on the home page: a plain hex colour only.
export const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);

const parseCta = (raw: unknown): CtaLink | undefined => {
  if (typeof raw !== "string" || !raw) return undefined;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.label !== "string" || typeof parsed.href !== "string") {
    throw new Error("Invalid CTA");
  }
  const href = parsed.href.trim();
  if (!isSafeBannerHref(href) || parsed.label.length > 80) throw new Error("Invalid CTA");
  return { label: parsed.label, href };
};

const ctaError = "Button links must be a page on this site (starting with /) or an https:// address.";
const colorError = "Accent colour must be a hex colour like #38bdf8.";

export const createBanner = async (req: AuthRequest, res: Response) => {
  validateControllerInput("createBanner", req);
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: "Image is required" });

  let primaryCta: CtaLink | undefined;
  let secondaryCta: CtaLink | undefined;
  try {
    primaryCta = parseCta(req.body.primaryCta);
    secondaryCta = parseCta(req.body.secondaryCta);
  } catch {
    return res.status(400).json({ message: ctaError });
  }
  if (!primaryCta) return res.status(400).json({ message: "primaryCta is required" });
  if (req.body.accentColor !== undefined && !isHexColor(req.body.accentColor)) return res.status(400).json({ message: colorError });

  const image = await storeUploadedFile(file);
  const session = await mongoose.startSession();
  const result: { banner?: InstanceType<typeof Banner> } = {};
  try {
    await session.withTransaction(async () => {
      const highestOrder = await Banner.findOne().sort({ order: -1 }).session(session);
      const [created] = await Banner.create([{
        image,
        eyebrow: req.body.eyebrow ?? "",
        accentColor: req.body.accentColor ?? "#000000",
        title: req.body.title,
        subtitle: req.body.subtitle ?? "",
        primaryCta,
        secondaryCta,
        promoCode: req.body.promoCodeId || undefined,
        isActive: req.body.isActive !== "false",
        order: (highestOrder?.order ?? -1) + 1,
      }], { session });
      await recordAuditEvent({
        actorId: req.userId!, action: "created", entityType: "banner",
        entityId: created.id, entityName: created.title, after: created.toObject(),
      }, session);
      result.banner = created;
    });
  } catch (error) {
    await deleteUploadedFile(image);
    throw error;
  } finally {
    await session.endSession();
  }
  if (!result.banner) throw new Error("Banner creation did not complete");

  res.status(201).json(shapeBanner(result.banner));
};

export const updateBanner = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateBanner", req);
  const file = req.file as Express.Multer.File | undefined;

  let primaryCta: CtaLink | undefined;
  let secondaryCta: CtaLink | undefined;
  try {
    primaryCta = parseCta(req.body.primaryCta);
    secondaryCta = parseCta(req.body.secondaryCta);
  } catch {
    return res.status(400).json({ message: ctaError });
  }
  if (req.body.accentColor !== undefined && !isHexColor(req.body.accentColor)) return res.status(400).json({ message: colorError });

  const update: Record<string, unknown> = {
    eyebrow: req.body.eyebrow,
    accentColor: req.body.accentColor,
    title: req.body.title,
    subtitle: req.body.subtitle,
    isActive: req.body.isActive !== "false",
  };
  if (primaryCta) update.primaryCta = primaryCta;
  // secondaryCta is optional — an explicit empty string means "remove it",
  // undefined (the field wasn't sent at all) means "leave it alone".
  if (req.body.secondaryCta !== undefined) update.secondaryCta = secondaryCta ?? null;
  // Same pattern as secondaryCta: an explicit empty string unlinks it,
  // undefined leaves whatever's there alone.
  if (req.body.promoCodeId !== undefined) update.promoCode = req.body.promoCodeId || null;

  // Same before/after pattern as productController#updateProduct: upload
  // the new image and save it first, and only delete the old one once
  // that's succeeded — never the other way around, so a failed upload or
  // DB write can't leave a banner with no image at all.
  let previousImage: string | undefined;
  let uploadedImage: string | undefined;
  const current = await Banner.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Banner not found" });
  if (file) {
    previousImage = current.image;
    uploadedImage = await storeUploadedFile(file);
    update.image = uploadedImage;
  }

  const session = await mongoose.startSession();
  const result: { banner: InstanceType<typeof Banner> | null } = { banner: null };
  let concurrentEdit = false;
  try {
    await session.withTransaction(async () => {
      const updated = await Banner.findOneAndUpdate(
        { _id: req.params.id, updatedAt: current.get("updatedAt") },
        update,
        { session, returnDocument: "after", runValidators: true }
      );
      if (!updated) {
        concurrentEdit = true;
        return;
      }
      await recordAuditEvent({
        actorId: req.userId!, action: "updated", entityType: "banner",
        entityId: updated.id, entityName: updated.title,
        before: current.toObject(), after: updated.toObject(),
      }, session);
      result.banner = updated;
    });
  } catch (error) {
    if (uploadedImage) await deleteUploadedFile(uploadedImage);
    throw error;
  } finally {
    await session.endSession();
  }
  if (concurrentEdit) {
    if (uploadedImage) await deleteUploadedFile(uploadedImage);
    return res.status(409).json({ message: "Banner changed; refresh and try again" });
  }
  if (!result.banner) {
    if (uploadedImage) await deleteUploadedFile(uploadedImage);
    return res.status(404).json({ message: "Banner not found" });
  }
  res.json(shapeBanner(result.banner));

  if (previousImage) await deleteUploadedFile(previousImage);
};

export const moveBanner = async (req: AuthRequest, res: Response) => {
  validateControllerInput("moveBanner", req);
  const { direction } = req.body as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({ message: "direction must be 'up' or 'down'" });
  }

  const session = await mongoose.startSession();
  const reordered: { banners: InstanceType<typeof Banner>[] | null } = { banners: null };
  let missing = false;
  let boundary = false;
  try {
    await session.withTransaction(async () => {
      const banners = await Banner.find().sort({ order: 1, _id: 1 }).session(session);
      const index = banners.findIndex((banner) => banner.id === req.params.id);
      if (index === -1) {
        missing = true;
        return;
      }
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= banners.length) {
        boundary = true;
        return;
      }

      const first = banners[index];
      const second = banners[swapIndex];
      const firstBefore = first.toObject();
      const secondBefore = second.toObject();
      [first.order, second.order] = [second.order, first.order];
      await first.save({ session });
      await second.save({ session });
      await recordAuditEvent({
        actorId: req.userId!, action: "reordered", entityType: "banner",
        entityId: first.id, entityName: first.title, before: firstBefore, after: first.toObject(),
      }, session);
      await recordAuditEvent({
        actorId: req.userId!, action: "reordered", entityType: "banner",
        entityId: second.id, entityName: second.title, before: secondBefore, after: second.toObject(),
      }, session);
      reordered.banners = banners.sort((a, b) => a.order - b.order);
    });
  } finally {
    await session.endSession();
  }
  if (missing) return res.status(404).json({ message: "Banner not found" });
  if (boundary) return res.status(400).json({ message: "Can't move further in that direction" });
  if (!reordered.banners) throw new Error("Banner reorder did not complete");
  res.json(reordered.banners.map(shapeBanner));
};

export const deleteBanner = async (req: AuthRequest, res: Response) => {
  validateControllerInput("deleteBanner", req);
  const session = await mongoose.startSession();
  const result: { banner: InstanceType<typeof Banner> | null } = { banner: null };
  try {
    await session.withTransaction(async () => {
      const current = await Banner.findById(req.params.id).session(session);
      if (!current) return;
      await recordAuditEvent({
        actorId: req.userId!, action: "deleted", entityType: "banner",
        entityId: current.id, entityName: current.title, before: current.toObject(),
      }, session);
      result.banner = await Banner.findOneAndDelete({ _id: current._id }, { session });
    });
  } finally {
    await session.endSession();
  }
  if (!result.banner) return res.status(404).json({ message: "Banner not found" });
  res.json({ message: "Banner deleted" });

  await deleteUploadedFile(result.banner.image);
};
