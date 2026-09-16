"use client";

import { usePathname } from "next/navigation";
import { DashboardSidebar } from "@/views/DashboardSidebar";
import { AuthModal } from "@/views/AuthModal";
import { EmailVerificationBanner } from "@/views/EmailVerificationBanner";
import { useRequireAuth } from "@/controllers/useRequireAuth";

// Checkout is driven entirely by the client-side cart — nothing on it
// depends on a logged-in fetch — so it can stay on screen while the login
// modal floats over it instead of being blanked out. Every other page here
// (dashboard, orders, settings, admin/*) loads account data in a
// mount-once effect that won't re-fire after login, so those still need the
// full gate + remount once signed in.
const RENDERS_WHILE_LOGGED_OUT = ["/checkout"];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isChecking, isAllowed } = useRequireAuth();
  const rendersWhileLoggedOut = RENDERS_WHILE_LOGGED_OUT.some((p) => pathname.startsWith(p));

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Checking your session...
      </div>
    );
  }

  if (!isAllowed) {
    if (rendersWhileLoggedOut) {
      return (
        <>
          {children}
          <AuthModal />
        </>
      );
    }

    return (
      <>
        <div className="min-h-screen flex items-center justify-center text-muted text-sm">
          Please log in to continue.
        </div>
        <AuthModal />
      </>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <DashboardSidebar />
      <div className="flex-1">
        <EmailVerificationBanner />
        {children}
      </div>
    </div>
  );
}
