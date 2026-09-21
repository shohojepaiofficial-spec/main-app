"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useAuthController } from "@/controllers/useAuthController";
import { useUIStore } from "@/controllers/useUIStore";

// Guards every page under app/(protected). Instead of silently bouncing an
// unauthenticated visitor back to the homepage, it opens the login modal
// right where they are — logging in just flips `isAuthenticated` (see
// AuthModal), so the page they were headed to renders immediately after,
// with nothing lost (e.g. the checkout flow they were mid-way through).
// Only if they dismiss the modal without signing in do we send them home.
export function useRequireAuth() {
  const router = useRouter();
  const { status } = useSession();
  const { user, isAuthenticated } = useAuthController();
  // Subscribed only so the effect re-runs when the modal is closed (to
  // decide whether that was a dismissal). The effect itself reads the
  // store's live value via getState() rather than this closed-over one —
  // React Strict Mode replays effects on mount, and by the second replay
  // this subscribed value would still be the stale pre-open snapshot,
  // firing a bogus redirect a beat before the modal's "open" state caught up.
  const isAuthModalOpen = useUIStore((s) => s.isAuthModalOpen);
  const hasPrompted = useRef(false);

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
  const isChecking = status === "loading" && !isAuthenticated;
  const isAllowed = isAuthenticated;

  useEffect(() => {
    if (isChecking || isAllowed) return;

    if (!hasPrompted.current) {
      hasPrompted.current = true;
      toast.error("Please log in first");
      useUIStore.getState().openAuthModal("login");
      return;
    }

    if (!useUIStore.getState().isAuthModalOpen) {
      router.replace("/");
    }
  }, [isChecking, isAllowed, isAuthModalOpen, router]);

  return { user, isChecking, isAllowed };
}
