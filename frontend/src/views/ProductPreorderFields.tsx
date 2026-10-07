"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";

// Mirrors server/src/models/Product.ts's MAX_PREORDER_DISCOUNT_PERCENT.
export const MAX_PREORDER_DISCOUNT_PERCENT = 90;

// The subset of ProductFormModal's form values this section edits.
export interface PreorderFormValues {
  preorderEnabled: boolean;
  preorderShipDate: string;
  preorderLimit: string;
  preorderCodDiscount: number;
  preorderOnlineDiscount: number;
}

interface ProductPreorderFieldsProps<T extends PreorderFormValues> {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  enabled: boolean;
  // Saved state — what's already promised, and whether it's on right now —
  // so the hints can say what saving will actually do.
  savedEnabled: boolean;
  reserved: number;
}

// Pre-order settings in the admin product form. While on, the product sells
// regardless of stock; the discounts depend on how the customer pays.
export function ProductPreorderFields<T extends PreorderFormValues>({
  register,
  errors,
  enabled,
  savedEnabled,
  reserved,
}: ProductPreorderFieldsProps<T>) {
  // The generic form type can't prove these field names exist on T, but the
  // PreorderFormValues constraint guarantees it.
  const reg = register as unknown as UseFormRegister<PreorderFormValues>;
  const err = errors as FieldErrors<PreorderFormValues>;

  return (
    <div className="rounded-md border border-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" {...reg("preorderEnabled")} />
        Sell as pre-order
      </label>
      <p className="mt-1 text-xs text-muted">
        For stock that hasn&apos;t arrived yet. Customers can order every size/color whatever the stock says, and the
        order waits until it arrives.
      </p>

      {savedEnabled && reserved > 0 && (
        <p className="mt-2 text-xs font-medium text-foreground">
          {reserved} unit{reserved === 1 ? " is" : "s are"} already promised to pre-orders.
          {!enabled && " When the stock arrives, set aside those units and enter only what's left as stock."}
        </p>
      )}
      {enabled && !savedEnabled && (
        <p className="mt-2 text-xs text-muted">Turning pre-order on starts the pre-order count from 0.</p>
      )}

      {enabled && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Expected ship date</label>
            <input
              {...reg("preorderShipDate")}
              type="date"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
            <p className="mt-1 text-xs text-muted">Shown as &quot;ships around&quot;. Optional.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Pre-order limit</label>
            <input
              {...reg("preorderLimit")}
              type="number"
              min="1"
              step="1"
              placeholder="No limit"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
            {err.preorderLimit && <p className="mt-1 text-sm text-red-600">{err.preorderLimit.message}</p>}
            <p className="mt-1 text-xs text-muted">Most units you&apos;ll take. Leave empty for no limit.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Cash on Delivery discount (%)</label>
            <input
              {...reg("preorderCodDiscount")}
              type="number"
              min="0"
              max={MAX_PREORDER_DISCOUNT_PERCENT}
              step="0.5"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
            {err.preorderCodDiscount && (
              <p className="mt-1 text-sm text-red-600">{err.preorderCodDiscount.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Online payment discount (%)</label>
            <input
              {...reg("preorderOnlineDiscount")}
              type="number"
              min="0"
              max={MAX_PREORDER_DISCOUNT_PERCENT}
              step="0.5"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
            {err.preorderOnlineDiscount && (
              <p className="mt-1 text-sm text-red-600">{err.preorderOnlineDiscount.message}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              For paying up front with bKash — usually bigger than the COD one. Customers see it as &quot;coming
              soon&quot; until bKash is live.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
