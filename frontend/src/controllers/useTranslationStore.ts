import { create } from "zustand";
import { getTranslations } from "@/services/translationService";

// The last dictionary this browser downloaded. Without it every full page
// load shows English until the fetch (about 2s on the live site) comes back.
const CACHE_KEY = "translations-bn";

function readCache(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : null;
  } catch {
    return null;
  }
}

function writeCache(dictionary: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dictionary));
  } catch {
    // Private window or full storage: the next load just fetches again.
  }
}

interface TranslationStoreState {
  dictionary: Record<string, string> | null;
  isLoading: boolean;
  // Whether this page load has already asked the server — the cached copy
  // alone doesn't count, so an admin's edit still arrives on the next load.
  hasFetched: boolean;
  // Loads the Bangla dictionary once per page load: the cached copy straight
  // away, then the server's. Safe to call from many components at once
  // (every <T>/useTranslations() call site does, on mount and whenever
  // locale flips to "bn"); the guard means only the first call does
  // anything. Fails soft: a failed fetch leaves `dictionary` as it was
  // (cached or null), so every call site's own English fallback keeps
  // rendering rather than the page breaking.
  ensureLoaded: () => void;
}

export const useTranslationStore = create<TranslationStoreState>((set, get) => ({
  dictionary: null,
  isLoading: false,
  hasFetched: false,
  ensureLoaded: () => {
    if (get().hasFetched || get().isLoading) return;
    set({ isLoading: true, dictionary: get().dictionary ?? readCache() });
    getTranslations()
      .then((dictionary) => {
        writeCache(dictionary);
        set({ dictionary, isLoading: false, hasFetched: true });
      })
      .catch((err) => {
        console.error("Failed to load translations:", err);
        set({ isLoading: false });
      });
  },
}));
