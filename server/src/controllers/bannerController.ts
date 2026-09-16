import { Response, Request } from "express";
import { Banner, CtaLink } from "../models/Banner";
import { PromoCode, IPromoCode } from "../models/PromoCode";
import { AuthRequest } from "../middleware/auth";
import { storeUploadedFile } from "../utils/upload";

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

const parseCta = (raw: unknown): CtaLink | undefined => {
  if (typeof raw !== "string" || !raw) return undefined;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.label !== "string" || typeof parsed.href !== "string") {
    throw new Error("Invalid CTA");
  }
  return { label: parsed.label, href: parsed.href };
};

export const createBanner = async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ message: "Image is required" });

  let primaryCta: CtaLink | undefined;
  let secondaryCta: CtaLink | undefined;
  try {
    primaryCta = parseCta(req.body.primaryCta);
    secondaryCta = parseCta(req.body.secondaryCta);
  } catch {
    return res.status(400).json({ message: "Invalid CTA data" });
  }
  if (!primaryCta) return res.status(400).json({ message: "primaryCta is required" });

  const highestOrder = await Banner.findOne().sort({ order: -1 });

  const banner = await Banner.create({
    image: await storeUploadedFile(file),
    eyebrow: req.body.eyebrow ?? "",
    accentColor: req.body.accentColor ?? "#000000",
    title: req.body.title,
    subtitle: req.body.subtitle ?? "",
    primaryCta,
    secondaryCta,
    promoCode: req.body.promoCodeId || undefined,
    isActive: req.body.isActive !== "false",
    order: (highestOrder?.order ?? -1) + 1,
  });

  res.status(201).json(shapeBanner(banner));
};

export const updateBanner = async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;

  let primaryCta: CtaLink | undefined;
  let secondaryCta: CtaLink | undefined;
  try {
    primaryCta = parseCta(req.body.primaryCta);
    secondaryCta = parseCta(req.body.secondaryCta);
  } catch {
    return res.status(400).json({ message: "Invalid CTA data" });
  }

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
  if (file) update.image = await storeUploadedFile(file);

  const banner = await Banner.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!banner) return res.status(404).json({ message: "Banner not found" });
  res.json(shapeBanner(banner));
};

export const moveBanner = async (req: AuthRequest, res: Response) => {
  const { direction } = req.body as { direction?: "up" | "down" };
  if (direction !== "up" && direction !== "down") {
    return res.status(400).json({ message: "direction must be 'up' or 'down'" });
  }

  const banners = await Banner.find().sort({ order: 1 });
  const index = banners.findIndex((b) => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Banner not found" });

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= banners.length) {
    return res.status(400).json({ message: "Can't move further in that direction" });
  }

  const a = banners[index];
  const b = banners[swapIndex];
  const aOrder = a.order;
  a.order = b.order;
  b.order = aOrder;
  await a.save();
  await b.save();

  res.json(banners.sort((x, y) => x.order - y.order).map(shapeBanner));
};

export const deleteBanner = async (req: Request, res: Response) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) return res.status(404).json({ message: "Banner not found" });
  res.json({ message: "Banner deleted" });
};
