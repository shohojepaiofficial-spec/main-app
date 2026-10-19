import { Product } from "../models/Product";
import { LOW_STOCK_THRESHOLD } from "./lowStock";
import { variantLabel } from "./productVariants";
import { notifyStaff } from "./notify";
import { staffLowStockNotification } from "./notificationMessages";

interface SoldLine {
  product: unknown;
  variant?: unknown;
  quantity: number;
  isPreorder?: boolean;
}

// Pure: which items this sale pushed to (or below) the low-stock line.
// Only the crossing counts — an item already low before the sale was
// alerted then, so each later sale doesn't re-alert.
export function itemsThatCrossedLowStock(
  lines: SoldLine[],
  products: { _id: unknown; name: string; stock: number; variants?: { _id: unknown; selections: Parameters<typeof variantLabel>[0]; stock: number }[] }[]
): string[] {
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const rows: string[] = [];
  for (const line of lines) {
    if (line.isPreorder) continue;
    const product = byId.get(String(line.product));
    if (!product) continue;
    const variant = line.variant ? product.variants?.find((v) => String(v._id) === String(line.variant)) : undefined;
    if (line.variant && !variant) continue;
    const now = variant ? variant.stock : product.stock;
    if (now <= LOW_STOCK_THRESHOLD && now + line.quantity > LOW_STOCK_THRESHOLD) {
      const label = variant ? `${product.name} · ${variantLabel(variant.selections)}` : product.name;
      rows.push(`${label}: ${now} left`);
    }
  }
  return rows;
}

// Called after a sale's transaction has committed. Fire-and-forget.
export function alertLowStockAfterSale(lines: SoldLine[]) {
  const ids = [...new Set(lines.filter((l) => !l.isPreorder).map((l) => String(l.product)))];
  if (ids.length === 0) return;
  Promise.resolve()
    .then(() => Product.find({ _id: { $in: ids } }).select("name stock variants").lean())
    .then((products) => {
      const rows = itemsThatCrossedLowStock(lines, products as never);
      if (rows.length) notifyStaff("products:manage", staffLowStockNotification(rows));
    })
    .catch((err) => console.error("Low stock alert failed:", (err as Error).message));
}
