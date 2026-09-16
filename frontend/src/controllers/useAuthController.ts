import { signOut as nextAuthSignOut } from "next-auth/react";
import { useAuthStore } from "@/controllers/useAuthStore";
import { Permission } from "@/models";

// `useAuthStore` is the single source of truth for "who's logged in" — both
// the email/password flow and the OAuth bridge (useOAuthBridge) write into it.
// This hook just adds the one thing OAuth needs on top: signing out of
// NextAuth too, so a stale OAuth session cookie doesn't silently log the user
// back in via useOAuthBridge on the next page load.
export function useAuthController() {
  const { user, logout: clearStore, isAuthenticated } = useAuthStore();

  const logout = async () => {
    await nextAuthSignOut({ redirect: false }).catch(() => {});
    clearStore();
  };

  // Admins implicitly hold every permission; coadmins only what's in their
  // `permissions` array. Mirrors the server's `authorize` middleware — this
  // is UI-gating only (show/hide), the API is the real enforcement.
  const hasPermission = (permission: Permission) =>
    user?.role === "admin" || !!user?.permissions?.includes(permission);

  return { user, isAuthenticated: isAuthenticated(), logout, hasPermission };
}
