import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthModalMode, Locale } from "@/models";

interface UIState {
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  isCartModalOpen: boolean;
  locale: Locale;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
  openCartModal: () => void;
  closeCartModal: () => void;
  setLocale: (locale: Locale) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isAuthModalOpen: false,
      authModalMode: "login",
      isCartModalOpen: false,
      locale: "en",
      openAuthModal: (mode = "login") => set({ isAuthModalOpen: true, authModalMode: mode }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
      setAuthModalMode: (mode) => set({ authModalMode: mode }),
      openCartModal: () => set({ isCartModalOpen: true }),
      closeCartModal: () => set({ isCartModalOpen: false }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({ locale: state.locale }),
      // Same fix as useCartStore.ts — persist's default synchronous
      // localStorage read at store-creation time means a visitor who
      // previously picked Bangla would get a client-only-mismatched first
      // render (server always renders the "en" default) the moment
      // LanguageSwitcher's `<select value={locale}>` reflects it. Deferring
      // to an explicit rehydrate() after mount (see app/providers.tsx) keeps
      // the first client render in agreement with the server.
      skipHydration: true,
    }
  )
);
