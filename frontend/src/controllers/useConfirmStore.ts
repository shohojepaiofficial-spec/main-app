import { create } from "zustand";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Reddens the confirm button — for destructive actions (delete, etc.).
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

interface ConfirmStore extends ConfirmState {
  request: (options: ConfirmOptions) => Promise<boolean>;
  handle: (result: boolean) => void;
}

// A promise-based, in-app replacement for `window.confirm` — see
// lib/confirm.ts for the ergonomic `confirmDialog()` wrapper callers should
// actually use, and views/ConfirmDialog.tsx (mounted once in the root
// layout) for what renders it.
export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  isOpen: false,
  message: "",
  request: (options) =>
    new Promise<boolean>((resolve) => {
      set({ ...options, isOpen: true, resolve });
    }),
  handle: (result) => {
    get().resolve?.(result);
    set({ isOpen: false, resolve: undefined });
  },
}));
