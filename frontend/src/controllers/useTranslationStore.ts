import { create } from "zustand";
import { getTranslations } from "@/services/translationService";

interface TranslationStoreState {
  dictionary: Record<string, string> | null;
  isLoading: boolean;
  // Fetches the Bangla dictionary once and caches it for the rest of the
  // session — safe to call from many components at once (every <T>/
  // useTranslations() call site does, on mount and whenever locale flips to
  // "bn"); the isLoading/dictionary guard means only the first call
  // actually fetches. Fails soft: a failed fetch just leaves `dictionary`
  // null, so every call site's own English fallback keeps rendering rather
  // than the page breaking.
  ensureLoaded: () => void;
}

export const useTranslationStore = create<TranslationStoreState>((set, get) => ({
  dictionary: null,
  isLoading: false,
  ensureLoaded: () => {
    if (get().dictionary || get().isLoading) return;
    set({ isLoading: true });
    getTranslations()
      .then((dictionary) => set({ dictionary, isLoading: false }))
      .catch((err) => {
        console.error("Failed to load translations:", err);
        set({ isLoading: false });
      });
  },
}));
