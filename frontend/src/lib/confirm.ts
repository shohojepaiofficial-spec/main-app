import { useConfirmStore } from "@/controllers/useConfirmStore";

// Drop-in-ish replacement for `window.confirm` that shows the app's own
// modal instead of the browser's built-in dialog — `useConfirmStore.getState()`
// is accessed directly (not the `useConfirmStore()` hook) since this is
// called from plain event handlers, not component bodies.
export function confirmDialog(
  message: string,
  options?: { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
): Promise<boolean> {
  return useConfirmStore.getState().request({ message, ...options });
}
