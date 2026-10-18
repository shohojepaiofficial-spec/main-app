"use client";

import { useState } from "react";
import { Order } from "@/models";

// Staff-only note on an order (never shown to the customer).
export function OrderNoteField({
  order,
  isSaving,
  onSave,
}: {
  order: Order;
  isSaving: boolean;
  onSave: (note: string) => void;
}) {
  const [value, setValue] = useState(order.internalNote ?? "");
  const isDirty = value !== (order.internalNote ?? "");

  return (
    <div className="mt-3 border-t border-border pt-3">
      <label className="mb-1 block text-xs font-medium text-muted" htmlFor={`note-${order._id}`}>
        Internal note (not visible to the customer)
      </label>
      <div className="flex gap-2">
        <textarea
          id={`note-${order._id}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          placeholder="e.g. Asked for evening delivery"
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />
        {isDirty && (
          <button
            onClick={() => onSave(value)}
            disabled={isSaving}
            className="shrink-0 self-start rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
