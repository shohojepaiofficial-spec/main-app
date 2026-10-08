import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { parseInput, objectId } from "../utils/checkoutValidation";

const bad = () => Object.assign(new Error("Invalid request fields"), { status: 400 });
let multipartRequests = 0;
export function boundMultipart(req: Request, res: Response, next: NextFunction) {
  if (!req.is("multipart/form-data")) return next();
  if (multipartRequests >= 8) return res.status(429).json({ message: "Uploads are busy; please retry" });
  multipartRequests++;
  let released = false;
  const release = () => { if (!released) { released = true; multipartRequests--; } };
  res.once("finish", release);
  res.once("close", release);
  next();
}
export function assertSafeInput(value: unknown, depth = 0): void {
  if (depth > 8) throw bad();
  if (Array.isArray(value)) {
    if (value.length > 100) throw bad();
    value.forEach(v => assertSafeInput(v, depth + 1));
  } else if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length > 100) throw bad();
    for (const [key, child] of entries) {
      if (key.startsWith("$") || key.includes(".") || ["__proto__", "prototype", "constructor"].includes(key)) throw bad();
      assertSafeInput(child, depth + 1);
    }
  } else if (typeof value === "string" && value.length > 32_768) throw bad();
}

export function requestValidation(req: Request, _res: Response, next: NextFunction) {
  try {
    assertSafeInput(req.body);
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value !== "string" || value.length > (key === "token" ? 4096 : 500) || /[$\[\].]/.test(key)) throw bad();
      if (["page", "limit"].includes(key) && (!/^\d+$/.test(value) || +value < 1 || +value > (key === "limit" ? 100 : 10000))) throw bad();
      if (["excludeId", "productId", "uid"].includes(key)) parseInput(objectId, value);
    }
    next();
  } catch (err) { next(err); }
}

const numeric = z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)]).pipe(z.number().finite().min(0).max(10_000_000));
const scalar = z.string().max(1000);
const jsonField = z.union([z.string().max(128 * 1024), z.array(z.unknown()).max(100), z.record(z.unknown())]);
const productSchema = z.object({
  name: scalar.optional(), description: z.string().max(20_000).optional(), category: scalar.optional(),
  price: numeric.optional(), stock: numeric.pipe(z.number().int()).optional(),
  deliveryFeeInsideCity: numeric.optional(), deliveryFeeOutsideCity: numeric.optional(), weightKg: numeric.optional(),
  isFeatured: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  options: jsonField.optional(), variants: jsonField.optional(), preorder: jsonField.optional(), existingImages: z.string().max(10_000).optional(),
}).strict();

export function productInput(body: unknown) {
  assertSafeInput(body);
  const parsed = parseInput(productSchema, body);
  const nested = {
    options: z.array(z.object({ name: scalar, values: z.array(scalar).max(100) }).strict()).max(10),
    variants: z.array(z.object({ _id: objectId.optional(), selections: z.array(z.object({ name: scalar, value: scalar }).strict()).max(10), price: numeric, stock: numeric.pipe(z.number().int()), sku: scalar.optional(), image: scalar.optional(), weightKg: z.union([numeric, z.literal(""), z.null()]).optional() }).strict()).max(100),
    preorder: z.object({ enabled: z.union([z.boolean(), z.enum(["true", "false"])]), shipDate: z.string().max(100).nullable().optional(), limit: z.union([numeric, z.literal(""), z.null()]).optional(), codDiscountPercent: z.union([numeric, z.literal(""), z.null()]).optional(), onlineDiscountPercent: z.union([numeric, z.literal(""), z.null()]).optional() }).strict(),
  };
  for (const key of ["options", "variants", "preorder"] as const) {
    if (parsed[key] !== undefined) {
      try {
        const value = typeof parsed[key] === "string" ? JSON.parse(parsed[key]) : parsed[key];
        assertSafeInput(value);
        parseInput(nested[key] as z.ZodTypeAny, value);
      } catch { throw bad(); }
    }
  }
  if (parsed.existingImages !== undefined) {
    try { parseInput(z.array(z.string().max(2048)).max(20), JSON.parse(parsed.existingImages)); } catch { throw bad(); }
  }
  return parsed;
}
