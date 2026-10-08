import { create } from "zustand";
import { User } from "@/models";
import { ensureSession, readSessionCookies, subscribeSession, tokenIsFresh, writeSessionCookies } from "@/lib/sessionClient";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isHydrating: boolean;
  setAuth: (token: string, user: User, refreshToken: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hydrate: () => Promise<void>;
  /** Refreshes the cached user (role/permissions) without touching the token — see useRefreshUser. */
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isHydrating: true,
  setAuth: (token, user, refreshToken) => {
    writeSessionCookies({ token, user, refreshToken });
    set({ token, user, refreshToken, isHydrating: false });
  },
  logout: () => {
    writeSessionCookies(null);
    set({ token: null, user: null, refreshToken: null, isHydrating: false });
  },
  isAuthenticated: () => {
    // Deliberately *not* falling back to Cookies.get() here: this store's
    // `token` starts null on both server and client (until `hydrate()` runs
    // in a useEffect, post-mount), but a cookie read is synchronously
    // available on the client immediately — so falling back to it made an
    // already-logged-in user's first client render disagree with the
    // server-rendered HTML (always logged-out), a real hydration mismatch.
    // Reading only the store keeps both renders in agreement; `hydrate()`
    // then flips it to true right after mount, same as any other client
    // state update.
    const { token, refreshToken } = get();
    return !!token && (tokenIsFresh(token) || tokenIsFresh(refreshToken));
  },
  hydrate: async () => {
    try {
      await ensureSession();
      const session = readSessionCookies();
      set(session ? { ...session, isHydrating: false } : { token: null, user: null, refreshToken: null, isHydrating: false });
    } catch {
      // Keep credentials during temporary outages; the next request can retry.
      const session = readSessionCookies();
      set(session ? { ...session, isHydrating: false } : { token: null, refreshToken: null, user: null, isHydrating: false });
    }
  },
  updateUser: (user) => {
    if (!get().token || get().user?.id !== user.id) return;
    const session = readSessionCookies();
    if (!session || session.user.id !== user.id || session.token !== get().token) return;
    writeSessionCookies({ ...session, user });
    set({ user });
  },
}));

subscribeSession((session) => useAuthStore.setState(session ? { ...session, isHydrating: false } : {
  token: null, refreshToken: null, user: null, isHydrating: false,
}));
