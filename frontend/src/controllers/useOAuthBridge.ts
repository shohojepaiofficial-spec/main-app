"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/controllers/useAuthStore";

// After a NextAuth OAuth sign-in resolves (see lib/auth.ts's jwt callback),
// the session carries our own backend JWT/user. Feed it into the same store
// the email/password flow uses, so the rest of the app (API calls, cart,
// navbar) only ever has to know about one auth source.
export function useOAuthBridge() {
  const { data: session } = useSession();
  const setAuth = useAuthStore((s) => s.setAuth);
  const currentToken = useAuthStore((s) => s.token);

  useEffect(() => {
    if (session?.backendToken && session.backendUser && session.backendToken !== currentToken) {
      setAuth(session.backendToken, session.backendUser);
    }
  }, [session, currentToken, setAuth]);
}
