"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/controllers/useAuthStore";
import { useUIStore } from "@/controllers/useUIStore";

// After a NextAuth OAuth sign-in resolves (see lib/auth.ts's jwt callback),
// the session carries our own backend JWT/user. Feed it into the same store
// the email/password flow uses, so the rest of the app (API calls, cart,
// navbar) only ever has to know about one auth source.
export function useOAuthBridge() {
  const { data: session } = useSession();
  const setAuth = useAuthStore((s) => s.setAuth);
  const currentToken = useAuthStore((s) => s.token);
  const openTwoFactorChallenge = useUIStore((s) => s.openTwoFactorChallenge);
  const currentTempToken = useUIStore((s) => s.twoFactorTempToken);

  useEffect(() => {
    if (session?.backendToken && session.backendUser && session.backendToken !== currentToken) {
      setAuth(session.backendToken, session.backendUser);
    } else if (
      session?.twoFactorRequired &&
      session.tempToken &&
      session.tempToken !== currentTempToken
    ) {
      // The Google account itself checked out fine, but this account also
      // has 2FA enabled — surface the same code-entry step LoginForm uses
      // for a local login, rather than completing sign-in silently.
      openTwoFactorChallenge(session.tempToken);
    }
  }, [session, currentToken, currentTempToken, setAuth, openTwoFactorChallenge]);
}
