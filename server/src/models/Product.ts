import { Schema, model, Document, Types } from "mongoose";

// One option axis a customer picks from — "Size" with values S/M/L, "Weight"
// with 250g/500g/1kg. Order matters: it's the order the product page shows
// the pickers in and the order a variant's label is built in ("Black / L").
export interface IProductOption {
  name: string;
  values: string[];
}

export interface IVariantSelection {
  name: string;
  value: string;
}

// One buyable combination of option values — "Black / L" — with its own
// price and stock. Selections are a name/value array rather than a Map so
// option names never have to be valid Mongo keys (a "." or "$" in one would
// break a Map). See utils/productVariants.ts for how these are validated.
export interface IProductVariant {
  _id: Types.ObjectId;
  selections: IVariantSelection[];
  price: number;
  stock: number;
  sku?: string;
  // One of the product's own `images` URLs, shown when this variant is
  // picked — never an independent upload.
  image?: string;
  // Overrides the product's weightKg for the Pathao delivery quote (a 1kg
  // tub ships heavier than a 250g one). Absent = use the product's.
  weightKg?: number;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  // Manually set by the admin, not computed from a courier's rates — there's
  // no shipping-provider integration, so these are just flat fees the admin
  // picks: one for delivery inside the city, one for outside it. See
  // docs/PROGRESS.md.
  deliveryFeeInsideCity: number;
  deliveryFeeOutsideCity: number;
  // Admin-picked, for the homepage's "Featured" section — not computed from
  // sales/clicks. See docs/PROGRESS.md.
  isFeatured: boolean;
  // Used only to size a live Pathao delivery quote at checkout (item_weight
  // on their price-plan/order APIs) — never shown to the customer. Defaults
  // to 0.5kg, Pathao's own minimum, for products created before this field
  // existed. See integrations/pathao.ts.
  weightKg: number;
  // Empty for a simple product (one price, one stock — how every product
  // worked before variants existed, so old products need no migration).
  // When non-empty, `variants` holds the real prices/stock and the
  // top-level `price`/`stock` above become derived summaries — lowest
  // variant price ("from ৳X") and total stock across variants — kept in
  // sync by productController on every write and by orderController's
  // stock updates, so listing, filtering and stats keep working unchanged.
  options: IProductOption[];
  variants: Types.DocumentArray<IProductVariant>;
  createdAt: Date;
}

const optionSchema = new Schema<IProductOption>(
  {
    name: { type: String, required: true, trim: true },
    values: { type: [String], default: [] },
  },
  { _id: false }
);

const selectionSchema = new Schema<IVariantSelection>(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Keeps its _id: carts, shared carts and orders reference a variant by it,
// so an edit that keeps a variant must keep its id too (productController
// passes existing ids back through).
const variantSchema = new Schema<IProductVariant>({
  selections: { type: [selectionSchema], default: [] },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  sku: { type: String, trim: true },
  image: { type: String },
  weightKg: { type: Number, min: 0.1 },
});

// Sanity ceiling on one product's flat delivery fee (BDT). Real couriers
// charge far less than this anywhere in Bangladesh, so a higher value is a
// typo (an extra digit) that would silently inflate every checkout that
// includes the product. Mirrored in frontend/src/views/ProductFormModal.tsx.
export const MAX_DELIVERY_FEE = 5000;
const deliveryFeeMax: [number, string] = [
  MAX_DELIVERY_FEE,
  `Delivery fee can't be more than ${MAX_DELIVERY_FEE} Tk`,
];

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
    deliveryFeeInsideCity: { type: Number, required: true, min: 0, max: deliveryFeeMax, default: 0 },
    deliveryFeeOutsideCity: { type: Number, required: true, min: 0, max: deliveryFeeMax, default: 0 },
    isFeatured: { type: Boolean, default: false },
    weightKg: { type: Number, required: true, min: 0.1, default: 0.5 },
    options: { type: [optionSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
  },
  { timestamps: true }
);

// Indexes for the shop/admin listing filters in productController.ts's
// getProducts (built by Mongoose on server start). Newest-first is the
// default sort and the date-range filter; stock backs both the stock filter
// and the dashboard's low-stock list; featured feeds the homepage. Category
// and name aren't indexed: they're matched case-insensitively by regex,
// which a plain index can't serve.
productSchema.index({ createdAt: -1 });
productSchema.index({ stock: 1 });
productSchema.index({ isFeatured: 1, createdAt: -1 });

export const Product = model<IProduct>("Product", productSchema);
