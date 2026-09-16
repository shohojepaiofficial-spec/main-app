"use client";

import { useEffect } from "react";
import { getCurrentUser } from "@/services/authService";
import { useAuthStore } from "@/controllers/useAuthStore";

// Fixes a real bug: an admin changing a coadmin's role/permissions had no
// way to reach that coadmin's browser — `user` (and its `permissions`) only
// ever got set at login time and cached in a cookie from then on, so a
// currently-logged-in coadmin's sidebar/access stayed stuck on whatever it
// was when they last logged in, even though the API itself (which re-checks
// the DB on every request, see server's authorize middleware) was already
// enforcing the new access correctly. This re-syncs it on every app load —
// still not live/instant, but a normal page refresh is enough now instead
// of a full log-out/log-in.
export function useRefreshUser() {
  const token = useAuthStore((s) => s.token);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    getCurrentUser()
      .then((user) => {
        if (!ignore) updateUser(user);
      })
      .catch(() => {
        // Expired/invalid token — the axios interceptor already attaches
        // whatever's in the cookie, and other calls will surface the 401.
      });
    return () => {
      ignore = true;
    };
  }, [token, updateUser]);
}
