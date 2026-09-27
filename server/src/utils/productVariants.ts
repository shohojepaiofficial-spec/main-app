import { Types } from "mongoose";
import type { IProductOption, IVariantSelection } from "../models/Product";

// Limits that keep the admin form and the product page usable — three
// option axes is what most stores (Shopify included) cap at, and 30 values
// per axis already covers every shoe-size range.
const MAX_OPTIONS = 3;
const MAX_VALUES_PER_OPTION = 30;
const MAX_VARIANTS = 100;
const MAX_LABEL_LENGTH = 40;

// Prefix the admin form uses for a variant image that's one of the files
// being uploaded in this same request, which has no URL yet — "new:2" means
// "the third uploaded file". Resolved to the real URL once it's stored.
const NEW_IMAGE_PREFIX = "new:";

export interface NormalizedVariant {
  _id: Types.ObjectId;
  selections: IVariantSelection[];
  price: number;
  stock: number;
  sku?: string;
  image?: string;
  weightKg?: number;
}

export interface NormalizedVariants {
  options: IProductOption[];
  variants: NormalizedVariant[];
}

function badRequest(message: string): never {
  throw { status: 400, message };
}

// Multipart form fields always arrive as strings, so options/variants come
// JSON-encoded; a plain JSON body could send them as real arrays.
function parseJsonArray(raw: unknown, field: string): unknown[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const value = typeof raw === "string" ? safeParse(raw, field) : raw;
  if (!Array.isArray(value)) badRequest(`${field} must be a list`);
  return value;
}

function safeParse(raw: string, field: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    badRequest(`${field} is not valid JSON`);
  }
}

// Every string here ends up stored and rendered, and some in Mongo filters —
// anything that isn't a real string (e.g. an injected `{ "$gt": "" }`) is
// rejected rather than coerced.
function cleanLabel(value: unknown, what: string): string {
  if (typeof value !== "string") badRequest(`${what} must be text`);
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) badRequest(`${what} can't be empty`);
  if (trimmed.length > MAX_LABEL_LENGTH) badRequest(`${what} is too long (max ${MAX_LABEL_LENGTH} characters)`);
  return trimmed;
}

function cleanNumber(value: unknown, what: string, { integer = false, min = 0 } = {}): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n < min) badRequest(`${what} must be a number of at least ${min}`);
  if (integer && !Number.isInteger(n)) badRequest(`${what} must be a whole number`);
  return n;
}

// Stable key for a combination, independent of which order the selections
// were sent in — used to reject two variants for the same combination.
function combinationKey(selections: IVariantSelection[]): string {
  return selections
    .map((s) => `${s.name.toLowerCase()}=${s.value.toLowerCase()}`)
    .sort()
    .join("|");
}

// Validates and normalizes the admin's options + variants. `finalImages` is
// the product's image list after this save, `newImages` the URLs of files
// uploaded in this request (in upload order) — together they resolve and
// validate each variant's image. Throws { status: 400, message } on
// anything malformed, so the controller can just catch and respond.
export function normalizeVariantInput(
  rawOptions: unknown,
  rawVariants: unknown,
  finalImages: string[],
  newImages: string[]
): NormalizedVariants {
  const optionInputs = parseJsonArray(rawOptions, "Options");
  const variantInputs = parseJsonArray(rawVariants, "Variants");

  if (optionInputs.length === 0) {
    if (variantInputs.length > 0) badRequest("Variants need at least one option (like Size or Color)");
    return { options: [], variants: [] };
  }
  if (optionInputs.length > MAX_OPTIONS) badRequest(`A product can have at most ${MAX_OPTIONS} options`);

  const options: IProductOption[] = [];
  const seenOptionNames = new Set<string>();
  for (const input of optionInputs) {
    const { name, values } = (input ?? {}) as { name?: unknown; values?: unknown };
    const cleanName = cleanLabel(name, "Option name");
    if (seenOptionNames.has(cleanName.toLowerCase())) badRequest(`Option "${cleanName}" is listed twice`);
    seenOptionNames.add(cleanName.toLowerCase());

    if (!Array.isArray(values) || values.length === 0) badRequest(`Option "${cleanName}" needs at least one value`);
    if (values.length > MAX_VALUES_PER_OPTION) {
      badRequest(`Option "${cleanName}" can have at most ${MAX_VALUES_PER_OPTION} values`);
    }
    const cleanValues: string[] = [];
    const seenValues = new Set<string>();
    for (const value of values) {
      const cleanValue = cleanLabel(value, `A value of "${cleanName}"`);
      if (seenValues.has(cleanValue.toLowerCase())) badRequest(`"${cleanValue}" is listed twice under "${cleanName}"`);
      seenValues.add(cleanValue.toLowerCase());
      cleanValues.push(cleanValue);
    }
    options.push({ name: cleanName, values: cleanValues });
  }

  if (variantInputs.length === 0) badRequest("Add at least one variant (a combination customers can buy)");
  if (variantInputs.length > MAX_VARIANTS) badRequest(`A product can have at most ${MAX_VARIANTS} variants`);

  const imageSet = new Set(finalImages);
  const seenCombinations = new Set<string>();
  const seenIds = new Set<string>();
  const variants: NormalizedVariant[] = [];

  for (const input of variantInputs) {
    const raw = (input ?? {}) as Record<string, unknown>;
    const rawSelections = Array.isArray(raw.selections) ? raw.selections : [];

    // Exactly one value per option, each one of that option's own values —
    // matched case-insensitively but stored with the option's own casing.
    const selections: IVariantSelection[] = options.map((option) => {
      const match = rawSelections.find(
        (s) => typeof s?.name === "string" && s.name.trim().toLowerCase() === option.name.toLowerCase()
      ) as { value?: unknown } | undefined;
      if (!match || typeof match.value !== "string") badRequest(`Every variant needs a ${option.name}`);
      const value = option.values.find((v) => v.toLowerCase() === (match.value as string).trim().toLowerCase());
      if (!value) badRequest(`"${match.value}" isn't one of the ${option.name} values`);
      return { name: option.name, value };
    });
    if (rawSelections.length !== options.length) badRequest("A variant has a value for an option that doesn't exist");

    const key = combinationKey(selections);
    const label = selections.map((s) => s.value).join(" / ");
    if (seenCombinations.has(key)) badRequest(`"${label}" is listed twice`);
    seenCombinations.add(key);

    // Keeping the existing id is what keeps carts and orders pointing at the
    // same variant across an edit; anything else gets a fresh one.
    const id =
      typeof raw._id === "string" && Types.ObjectId.isValid(raw._id) && !seenIds.has(raw._id)
        ? new Types.ObjectId(raw._id)
        : new Types.ObjectId();
    seenIds.add(id.toString());

    const variant: NormalizedVariant = {
      _id: id,
      selections,
      price: cleanNumber(raw.price, `Price for "${label}"`),
      stock: cleanNumber(raw.stock, `Stock for "${label}"`, { integer: true }),
    };

    if (typeof raw.sku === "string" && raw.sku.trim()) variant.sku = raw.sku.trim().slice(0, 64);

    if (raw.weightKg !== undefined && raw.weightKg !== null && raw.weightKg !== "") {
      variant.weightKg = cleanNumber(raw.weightKg, `Weight for "${label}"`, { min: 0.1 });
    }

    if (typeof raw.image === "string" && raw.image) {
      const resolved = raw.image.startsWith(NEW_IMAGE_PREFIX)
        ? newImages[Number(raw.image.slice(NEW_IMAGE_PREFIX.length))]
        : raw.image;
      // An image removed in this same edit just drops the variant back to
      // the product's main images rather than failing the whole save.
      if (resolved && imageSet.has(resolved)) variant.image = resolved;
    }

    variants.push(variant);
  }

  return { options, variants };
}

// The derived top-level summary for a product with variants — see
// Product.ts's `options` comment.
export function summarizeVariants(variants: { price: number; stock: number }[]) {
  return {
    price: Math.min(...variants.map((v) => v.price)),
    stock: variants.reduce((total, v) => total + v.stock, 0),
  };
}

// "Black / L" — what carts, orders, receipts and the admin see.
export function variantLabel(selections: IVariantSelection[]): string {
  return selections.map((s) => s.value).join(" / ");
}

interface PurchasableProduct {
  name: string;
  price: number;
  stock: number;
  weightKg?: number;
  options: IProductOption[];
  variants: { _id: Types.ObjectId; selections: IVariantSelection[]; price: number; stock: number; sku?: string; image?: string; weightKg?: number }[];
}

export interface PurchasableLine {
  price: number;
  stock: number;
  weightKg?: number;
  variant?: {
    _id: Types.ObjectId;
    label: string;
    selections: IVariantSelection[];
    sku?: string;
    image?: string;
  };
}

// What's actually being bought for one cart line: the variant's own
// price/stock/weight for a product with variants, the product's for a simple
// one. The single place checkout, delivery quotes and shared carts decide
// this, so they can never disagree. Throws { status: 400 } when a product
// with variants arrives without a (still-existing) variant — e.g. a cart
// saved before the admin added options, or a variant deleted since.
export function resolvePurchasable(product: PurchasableProduct, variantId: unknown): PurchasableLine {
  if (product.variants.length === 0) {
    // A leftover variantId on a now-simple product is harmless — the
    // server-side price/stock below are what count either way.
    return { price: product.price, stock: product.stock, weightKg: product.weightKg };
  }

  const variant =
    typeof variantId === "string" ? product.variants.find((v) => v._id.toString() === variantId) : undefined;
  if (!variant) {
    const optionNames = product.options.map((o) => o.name.toLowerCase()).join(" and ");
    throw {
      status: 400,
      message:
        variantId === undefined || variantId === null || variantId === ""
          ? `Please choose ${optionNames} for "${product.name}"`
          : `The option you picked for "${product.name}" is no longer available — please update your cart.`,
    };
  }

  return {
    price: variant.price,
    stock: variant.stock,
    weightKg: variant.weightKg ?? product.weightKg,
    variant: {
      _id: variant._id,
      label: variantLabel(variant.selections),
      selections: variant.selections.map((s) => ({ name: s.name, value: s.value })),
      sku: variant.sku,
      image: variant.image,
    },
  };
}

// Starting-point options for a category nobody has added a product to yet —
// once one exists, productController suggests whatever options that
// category's real products use instead (see getOptionSuggestions). Matched
// by keyword because categories are free text, same approach as the
// category tile icons.
const PRESETS: { pattern: RegExp; options: IProductOption[] }[] = [
  {
    pattern: /shoe|sneaker|footwear|boot|sandal|slipper|loafer/i,
    options: [
      { name: "Size", values: ["38", "39", "40", "41", "42", "43", "44"] },
      { name: "Color", values: ["Black", "White"] },
    ],
  },
  {
    pattern: /cloth|apparel|fashion|wear|shirt|hoodie|jacket|pant|jean|dress|kurti|panjabi|saree|sweater|\btops?\b/i,
    options: [
      { name: "Size", values: ["S", "M", "L", "XL", "XXL"] },
      { name: "Color", values: ["Black", "White"] },
    ],
  },
  {
    pattern: /supplement|protein|whey|creatine|vitamin|nutrition|gainer|pre.?workout/i,
    options: [
      { name: "Weight", values: ["250g", "500g", "1kg"] },
      { name: "Flavor", values: ["Unflavored", "Chocolate", "Vanilla"] },
    ],
  },
  {
    pattern: /phone|mobile|laptop|tablet|electronic|gadget|computer/i,
    options: [
      { name: "Storage", values: ["64GB", "128GB", "256GB"] },
      { name: "Color", values: ["Black", "White"] },
    ],
  },
  {
    pattern: /perfume|fragrance|attar|cologne|body.?spray/i,
    options: [{ name: "Volume", values: ["30ml", "50ml", "100ml"] }],
  },
  {
    pattern: /grocery|food|rice|oil|honey|tea|coffee|spice|dal|sugar|flour/i,
    options: [{ name: "Weight", values: ["500g", "1kg", "5kg"] }],
  },
];

export function presetOptionsForCategory(category: string): IProductOption[] {
  return PRESETS.find((preset) => preset.pattern.test(category))?.options ?? [];
}
