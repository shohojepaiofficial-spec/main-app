"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useConfirmStore } from "@/controllers/useConfirmStore";

// Mounted once in the root layout — see lib/confirm.ts for how a component
// actually asks for a confirmation.
export function ConfirmDialog() {
  const { isOpen, title, message, confirmLabel, cancelLabel, danger, handle } = useConfirmStore();

  return (
    <Modal isOpen={isOpen} onClose={() => handle(false)} widthClassName="max-w-sm">
      <div className="flex items-start gap-3">
        {danger && <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />}
        <div>
          {title && <h2 className="mb-1 text-sm font-semibold">{title}</h2>}
          <p className="text-sm text-muted">{message}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={() => handle(false)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
        >
          {cancelLabel ?? "Cancel"}
        </button>
        <button
          onClick={() => handle(true)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
            danger ? "bg-red-600 hover:bg-red-700" : "bg-primary text-primary-foreground hover:bg-primary-hover"
          }`}
        >
          {confirmLabel ?? "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
