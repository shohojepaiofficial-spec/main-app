import { create } from "zustand";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { User, DecodedToken } from "@/models";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hydrate: () => void;
  /** Refreshes the cached user (role/permissions) without touching the token — see useRefreshUser. */
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  setAuth: (token, user) => {
    Cookies.set("token", token, { expires: 7 });
    Cookies.set("user", JSON.stringify(user), { expires: 7 });
    set({ token, user });
  },
  logout: () => {
    Cookies.remove("token");
    Cookies.remove("user");
    set({ token: null, user: null });
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
    const token = get().token;
    if (!token) return false;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },
  hydrate: () => {
    const token = Cookies.get("token");
    const rawUser = Cookies.get("user");
    if (token && rawUser) {
      try {
        set({ token, user: JSON.parse(rawUser) as User });
      } catch {
        // ignore malformed cookie
      }
    }
  },
  updateUser: (user) => {
    Cookies.set("user", JSON.stringify(user), { expires: 7 });
    set({ user });
  },
}));
