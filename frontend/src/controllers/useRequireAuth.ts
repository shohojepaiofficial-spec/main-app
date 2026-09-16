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

  const isChecking = status === "loading";
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
