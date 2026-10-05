"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useAuthController } from "@/controllers/useAuthController";
import { useAuthStore } from "@/controllers/useAuthStore";
import { useUIStore } from "@/controllers/useUIStore";
import { translateNow } from "@/controllers/useTranslations";

// Guards every page under app/(protected). Instead of silently bouncing an
// unauthenticated visitor back to the homepage, it opens the login modal
// right where they are — logging in just flips `isAuthenticated` (see
// AuthModal), so the page they were headed to renders immediately after,
// with nothing lost (e.g. the checkout flow they were mid-way through).
// Only if they dismiss the modal without signing in do we send them home.
export function useRequireAuth() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const { user, isAuthenticated } = useAuthController();
  const token = useAuthStore((s) => s.token);
  // Subscribed only so the effect re-runs when the modal is closed (to
  // decide whether that was a dismissal). The effect itself reads the
  // store's live value via getState() rather than this closed-over one —
  // React Strict Mode replays effects on mount, and by the second replay
  // this subscribed value would still be the stale pre-open snapshot,
  // firing a bogus redirect a beat before the modal's "open" state caught up.
  const isAuthModalOpen = useUIStore((s) => s.isAuthModalOpen);
  const hasPrompted = useRef(false);
  // Whether this page has been showing a logged-in user — losing that is a
  // logout or an expiry, not a visitor who arrived logged out.
  const wasAllowed = useRef(false);

  // NextAuth's `useSession()` always starts "loading" on every client mount
  // and only resolves after a real network round-trip to /api/auth/session
  // — but `useAuthStore`'s own `isAuthenticated` is already known by then
  // for the common case (a returning email/password user, or a returning
  // OAuth user already bridged from a previous visit): `hydrate()` reads it
  // straight off a cookie in an effect right after mount, no network call
  // needed. Waiting on `status` regardless of that used to cost every
  // protected-page load a "Checking your session..." flash even when the
  // answer was already known. Still wait on `status` when `useAuthStore`
  // doesn't yet know the answer — that's the one case this delay is for: a
  // fresh OAuth login where useOAuthBridge hasn't populated the store yet,
  // where concluding "not logged in" early would be a false negative.
  //
  // `bridgePending` covers the step after that: the session has resolved
  // with a backend token the store doesn't hold yet. useOAuthBridge copies
  // it over in its own effect, but it lives in app/providers.tsx — an
  // ancestor — and React runs child effects first, so without this the
  // effect below saw "not logged in" for one commit right after every
  // Google redirect and fired the "Please log in first" toast + modal at a
  // user who was already signed in.
  const bridgePending =
    status === "authenticated" && !!session?.backendToken && session.backendToken !== token;
  const isChecking = !isAuthenticated && (status === "loading" || bridgePending);
  const isAllowed = isAuthenticated;

  useEffect(() => {
    if (isAllowed) {
      wasAllowed.current = true;
      return;
    }
    if (isChecking) return;

    if (wasAllowed.current) {
      wasAllowed.current = false;
      hasPrompted.current = true;
      if (!token) {
        // The user pressed "Log out" (logout() clears the token; an expiry
        // leaves it in place). They meant to leave, so take them to the
        // store instead of greeting them with a login prompt.
        router.replace("/");
        return;
      }
      toast.error(translateNow("auth.sessionExpired", "Your session has expired — please log in again"));
      useUIStore.getState().openAuthModal("login");
      return;
    }

    if (!hasPrompted.current) {
      hasPrompted.current = true;
      toast.error(translateNow("auth.pleaseLogInFirst", "Please log in first"));
      useUIStore.getState().openAuthModal("login");
      return;
    }

    if (!useUIStore.getState().isAuthModalOpen) {
      router.replace("/");
    }
  }, [isChecking, isAllowed, isAuthModalOpen, token, router]);

  return { user, isChecking, isAllowed };
}
