"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import { useAuthStore } from "@/controllers/useAuthStore";
import { useUIStore } from "@/controllers/useUIStore";
import { translateNow } from "@/controllers/useTranslations";
import { DecodedToken } from "@/models";

function isExpired(token: string) {
  try {
    return jwtDecode<DecodedToken>(token).exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// After a NextAuth OAuth sign-in resolves (see lib/auth.ts's jwt callback),
// the session carries our own backend JWT/user. Feed it into the same store
// the email/password flow uses, so the rest of the app (API calls, cart,
// navbar) only ever has to know about one auth source.
export function useOAuthBridge() {
  const { data: session, status } = useSession();
  const setAuth = useAuthStore((s) => s.setAuth);
  const currentToken = useAuthStore((s) => s.token);
  const openTwoFactorChallenge = useUIStore((s) => s.openTwoFactorChallenge);
  const currentTempToken = useUIStore((s) => s.twoFactorTempToken);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    if (session.backendToken && session.backendUser) {
      if (session.backendToken === currentToken) return;
      // The NextAuth session outlives the backend JWT inside it (30 days vs
      // the JWT's own expiry), so a long-idle browser can bring back a dead
      // token. Drop that session instead of "logging in" with it.
      if (isExpired(session.backendToken)) {
        signOut({ redirect: false }).catch(() => {});
        return;
      }
      setAuth(session.backendToken, session.backendUser);
      toast.success(translateNow("auth.loggedIn", "Logged in"));
    } else if (session.twoFactorRequired && session.tempToken) {
      if (session.tempToken === currentTempToken) return;
      // The Google account itself checked out fine, but this account also
      // has 2FA enabled — surface the same code-entry step LoginForm uses
      // for a local login, rather than completing sign-in silently.
      openTwoFactorChallenge(session.tempToken);
    } else {
      // Google accepted the user but lib/auth.ts's call to our backend's
      // oauth-sync failed (backend restarting/unreachable, secret mismatch —
      // the server logs say which), so there's no account session to hand
      // over. This used to fail silently: the user came back from Google
      // still logged out with no explanation. Say so, and clear the
      // half-finished session so the next attempt starts clean.
      toast.error(translateNow("auth.googleSignInFailed", "Google sign-in didn't finish. Please try again."));
      signOut({ redirect: false }).catch(() => {});
    }
  }, [session, status, currentToken, currentTempToken, setAuth, openTwoFactorChallenge]);
}
