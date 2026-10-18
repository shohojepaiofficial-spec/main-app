"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuthController } from "@/controllers/useAuthController";

// The API refuses every staff route (code TWO_FACTOR_REQUIRED) until an
// admin/coadmin turns on two-step verification, so say why and where to fix
// it. English only, like the rest of the admin panel. `undefined` (an old
// cached user) means "not known yet" — useRefreshUser fills it in.
export function StaffTwoFactorBanner() {
  const { user } = useAuthController();
  if (!user || (user.role !== "admin" && user.role !== "coadmin") || user.twoFactorEnabled !== false) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 print:hidden">
      <ShieldAlert size={15} className="shrink-0" />
      <span>The staff dashboard is locked until you turn on two-step verification for your account.</span>
      <Link href="/settings" className="ml-auto shrink-0 font-medium underline hover:no-underline">
        Turn it on in Settings
      </Link>
    </div>
  );
}
