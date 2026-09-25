import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthModalMode, Locale } from "@/models";

interface UIState {
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  // The short-lived challenge token from a login/oauth-sync/reset-password
  // response that came back `{ twoFactorRequired: true, tempToken }` —
  // AuthModal's "twoFactor" mode reads this to complete the exchange. Never
  // persisted (see `partialize` below) — it's only ever meant to survive
  // this one page load, same lifetime as the backend token itself (5min).
  twoFactorTempToken: string | null;
  isCartModalOpen: boolean;
  locale: Locale;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
  // Opens the modal straight into the code-entry step — used both by
  // AuthModal's own local-login flow and useOAuthBridge for a pending
  // Google sign-in.
  openTwoFactorChallenge: (tempToken: string) => void;
  openCartModal: () => void;
  closeCartModal: () => void;
  setLocale: (locale: Locale) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isAuthModalOpen: false,
      authModalMode: "login",
      twoFactorTempToken: null,
      isCartModalOpen: false,
      locale: "en",
      openAuthModal: (mode = "login") => set({ isAuthModalOpen: true, authModalMode: mode }),
      closeAuthModal: () => set({ isAuthModalOpen: false, twoFactorTempToken: null }),
      setAuthModalMode: (mode) => set({ authModalMode: mode }),
      openTwoFactorChallenge: (tempToken) =>
        set({ isAuthModalOpen: true, authModalMode: "twoFactor", twoFactorTempToken: tempToken }),
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
