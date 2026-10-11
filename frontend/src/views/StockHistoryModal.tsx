"use client";

import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/views/Pagination";
import { useStockHistory } from "@/controllers/useStockHistory";
import { Product, StockMovement, StockMovementReason } from "@/models";

const REASON_LABELS: Record<StockMovementReason, string> = {
  sale: "Sold",
  cancellation: "Order cancelled",
  return: "Returned",
  adjustment: "Edited by staff",
};

const shortId = (id: string) => id.slice(-6).toUpperCase();

function source(entry: StockMovement) {
  if (entry.reason === "adjustment") return entry.actor?.name ?? "Staff";
  if (entry.order) return `Order #${shortId(entry.order)}`;
  return "";
}

interface StockHistoryModalProps {
  product: Product | null;
  onClose: () => void;
}

// Every stock change for one product, newest first: sales, cancellations,
// returns and staff edits, per variant.
export function StockHistoryModal({ product, onClose }: StockHistoryModalProps) {
  return (
    <Modal
      isOpen={product !== null}
      onClose={onClose}
      title={product ? `Stock history · ${product.name}` : "Stock history"}
      widthClassName="max-w-lg"
      guardUnsavedChanges={false}
    >
      {product && <StockHistoryList key={product._id} productId={product._id} />}
    </Modal>
  );
}

function StockHistoryList({ productId }: { productId: string }) {
  const { items, page, totalPages, goToPage, isLoading, loadFailed } = useStockHistory(productId);

  return (
    <>
      {isLoading && items.length === 0 ? (
        <div className="flex justify-center py-8 text-muted">
          <Loader2 className="animate-spin" size={20} aria-label="Loading stock history" />
        </div>
      ) : loadFailed ? (
        <p className="py-6 text-sm text-red-600">Couldn&apos;t load the stock history. Please try again.</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-sm text-muted">
          No stock changes recorded yet. History starts from when this feature was deployed.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((entry) => (
            <li key={entry._id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {REASON_LABELS[entry.reason]}
                  {entry.variantLabel && <span className="font-normal text-muted"> · {entry.variantLabel}</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
                  {source(entry) && <> · {source(entry)}</>}
                </p>
              </div>
              <span className={`shrink-0 font-semibold ${entry.change < 0 ? "text-red-600" : "text-primary"}`}>
                {entry.change > 0 ? `+${entry.change}` : entry.change}
              </span>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={goToPage} />}
    </>
  );
}
