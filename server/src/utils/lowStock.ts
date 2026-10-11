import { variantLabel } from "./productVariants";
import type { IVariantSelection } from "../models/Product";

// "Running low" everywhere: the dashboard list, the Manage Products filter
// and the analytics tile. Checked per variant for a product with variants,
// so one size selling out isn't hidden by a big total.
export const LOW_STOCK_THRESHOLD = 5;

// Mongo filter for "the product, or any of its variants, is running low".
export const lowStockFilter = {
  $or: [
    { variants: { $size: 0 }, stock: { $lte: LOW_STOCK_THRESHOLD } },
    { variants: { $elemMatch: { stock: { $lte: LOW_STOCK_THRESHOLD } } } },
  ],
};

export interface LowStockRow {
  _id: string;
  name: string;
  variantId?: string;
  variantLabel?: string;
  stock: number;
}

interface ProductLike {
  _id: unknown;
  name: string;
  stock: number;
  variants?: { _id: unknown; selections: IVariantSelection[]; stock: number }[];
}

// Flattens products into one row per low item (the product, or each low
// variant), lowest stock first.
export function lowStockRows(products: ProductLike[]): LowStockRow[] {
  const rows: LowStockRow[] = [];
  for (const p of products) {
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        if (v.stock <= LOW_STOCK_THRESHOLD) {
          rows.push({ _id: String(p._id), name: p.name, variantId: String(v._id), variantLabel: variantLabel(v.selections), stock: v.stock });
        }
      }
    } else if (p.stock <= LOW_STOCK_THRESHOLD) {
      rows.push({ _id: String(p._id), name: p.name, stock: p.stock });
    }
  }
  return rows.sort((a, b) => a.stock - b.stock);
}
