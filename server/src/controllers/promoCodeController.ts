import { Request, Response } from "express";
import { Types } from "mongoose";
import { PromoCode, DiscountType, PromoScope } from "../models/PromoCode";
import { Product } from "../models/Product";
import { isNonEmptyString } from "../utils/validate";

const shapePromo = (promo: InstanceType<typeof PromoCode>) => ({
  id: promo.id,
  code: promo.code,
  discountType: promo.discountType,
  value: promo.value,
  scope: promo.scope,
  productId: promo.product?.toString(),
  isActive: promo.isActive,
  expiresAt: promo.expiresAt,
  createdAt: promo.createdAt,
});

export const getPromoCodes = async (_req: Request, res: Response) => {
  const promos = await PromoCode.find().sort({ createdAt: -1 });
  const productIds = promos.map((p) => p.product).filter((id): id is Types.ObjectId => !!id);
  const products = await Product.find({ _id: { $in: productIds } });
  const nameById = new Map(products.map((p) => [p.id as string, p.name as string]));

  res.json(
    promos.map((promo) => ({
      ...shapePromo(promo),
      productName: promo.product ? nameById.get(promo.product.toString()) : undefined,
    }))
  );
};

// Public — feeds on-site promo discovery: a sitewide announcement strip
// (scope "all") and per-product "use code X for Y% off" badges (scope
// "product"). Deliberately minimal shape — no id/createdAt, nothing an admin
// needs but a customer doesn't.
export const getActivePromoCodes = async (_req: Request, res: Response) => {
  const now = new Date();
  const promos = await PromoCode.find({
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
  });

  res.json(
    promos.map((promo) => ({
      code: promo.code,
      discountType: promo.discountType,
      value: promo.value,
      scope: promo.scope,
      productId: promo.product?.toString(),
    }))
  );
};

const validateInput = (body: Record<string, unknown>) => {
  const { code, discountType, value, scope, productId, isActive, expiresAt } = body as {
    code?: string;
    discountType?: DiscountType;
    value?: number;
    scope?: PromoScope;
    productId?: string;
    isActive?: boolean;
    expiresAt?: string | null;
  };

  if (!isNonEmptyString(code)) return { error: "Code is required" };
  if (discountType !== "percentage" && discountType !== "flat") {
    return { error: "discountType must be 'percentage' or 'flat'" };
  }
  if (typeof value !== "number" || value < 0) return { error: "value must be a positive number" };
  if (discountType === "percentage" && value > 100) {
    return { error: "A percentage discount can't exceed 100" };
  }
  if (scope !== "all" && scope !== "product") return { error: "scope must be 'all' or 'product'" };
  if (scope === "product" && !productId) {
    return { error: "productId is required when scope is 'product'" };
  }

  return {
    data: {
      code: code.trim().toUpperCase(),
      discountType,
      value,
      scope,
      product: scope === "product" ? productId : undefined,
      isActive: isActive ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    },
  };
};

export const createPromoCode = async (req: Request, res: Response) => {
  const { data, error } = validateInput(req.body);
  if (error) return res.status(400).json({ message: error });

  const existing = await PromoCode.findOne({ code: data!.code });
  if (existing) return res.status(409).json({ message: "That code already exists" });

  const promo = await PromoCode.create(data!);
  res.status(201).json(shapePromo(promo));
};

export const updatePromoCode = async (req: Request, res: Response) => {
  const { data, error } = validateInput(req.body);
  if (error) return res.status(400).json({ message: error });

  const existing = await PromoCode.findOne({ code: data!.code, _id: { $ne: req.params.id } });
  if (existing) return res.status(409).json({ message: "That code already exists" });

  const promo = await PromoCode.findByIdAndUpdate(req.params.id, data!, {
    new: true,
    runValidators: true,
  });
  if (!promo) return res.status(404).json({ message: "Promo code not found" });
  res.json(shapePromo(promo));
};

export const deletePromoCode = async (req: Request, res: Response) => {
  const promo = await PromoCode.findByIdAndDelete(req.params.id);
  if (!promo) return res.status(404).json({ message: "Promo code not found" });
  res.json({ message: "Promo code deleted" });
};

// Public — anyone (including guests) can check a code, both for the manual
// "enter a promo code" box and for a code auto-applied from a shared/banner
// link (see frontend's PromoAutoApply). Only confirms the code's terms; the
// actual discount math happens client-side against the cart, which is
// client-only state (see docs/ARCHITECTURE.md's Auth section for the same
// pattern elsewhere — nothing server-side to check it against yet).
export const validatePromoCode = async (req: Request, res: Response) => {
  const { code, productId } = req.body as { code?: string; productId?: string };
  if (!isNonEmptyString(code)) return res.status(400).json({ message: "code is required" });

  const promo = await PromoCode.findOne({ code: code.trim().toUpperCase() });
  if (!promo || !promo.isActive) {
    return res.status(404).json({ message: "Invalid or expired promo code" });
  }
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return res.status(404).json({ message: "Invalid or expired promo code" });
  }
  // Only enforce the product match when a productId was actually given (e.g.
  // applying from that product's page). Applying from the cart's generic
  // promo box omits it — the client checks the returned productId against
  // what's actually in the cart itself instead.
  if (promo.scope === "product" && productId !== undefined && promo.product?.toString() !== productId) {
    return res.status(400).json({ message: "This code doesn't apply to that product" });
  }

  res.json({
    code: promo.code,
    discountType: promo.discountType,
    value: promo.value,
    scope: promo.scope,
    productId: promo.product?.toString(),
  });
};
