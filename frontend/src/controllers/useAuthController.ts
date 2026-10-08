import { signOut as nextAuthSignOut } from "next-auth/react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/controllers/useAuthStore";
import { translateNow } from "@/controllers/useTranslations";
import { Permission } from "@/models";
import { endSession } from "@/lib/sessionClient";

// `useAuthStore` is the single source of truth for "who's logged in" — both
// the email/password flow and the OAuth bridge (useOAuthBridge) write into it.
// This hook just adds the one thing OAuth needs on top: signing out of
// NextAuth too, so a stale OAuth session cookie doesn't silently log the user
// back in via useOAuthBridge on the next page load.
export function useAuthController() {
  const { user, isAuthenticated } = useAuthStore();

  const logout = async (allDevices = false) => {
    try {
      await endSession(allDevices);
      await nextAuthSignOut({ redirect: false }).catch(() => {});
      toast.success(translateNow("auth.loggedOut", "Logged out"));
    } catch {
      toast.error(translateNow("auth.logoutFailed", "Logout could not be confirmed. Please try again."));
    }
  };

  // Admins implicitly hold every permission; coadmins only what's in their
  // `permissions` array. Mirrors the server's `authorize` middleware — this
  // is UI-gating only (show/hide), the API is the real enforcement.
  const hasPermission = (permission: Permission) =>
    user?.role === "admin" || (user?.role === "coadmin" && !!user.permissions?.includes(permission));

  return { user, isAuthenticated: isAuthenticated(), logout: () => logout(false), logoutAll: () => logout(true), hasPermission };
}
