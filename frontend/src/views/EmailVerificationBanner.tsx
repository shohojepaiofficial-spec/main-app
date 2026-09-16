"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthController } from "@/controllers/useAuthController";
import * as authService from "@/services/authService";

function extractErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

// Shown across every page under (protected) — not a hard gate, just a
// reminder + one-click resend. Nothing in the app is actually blocked by an
// unverified email yet (see docs/ARCHITECTURE.md's "Email verification &
// password reset").
export function EmailVerificationBanner() {
  const { user } = useAuthController();
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // `undefined` (a stale cached user object from before this field existed)
  // is treated as "don't know yet", not "unverified" — useRefreshUser syncs
  // the real value in shortly after mount.
  if (!user || user.isEmailVerified !== false) return null;

  const onResend = async () => {
    setIsSending(true);
    try {
      await authService.resendVerificationEmail();
      setSent(true);
      toast.success("Verification email sent");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to send verification email"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-900 print:hidden">
      <Mail size={15} className="shrink-0" />
      <span>Please verify your email address ({user.email}) to secure your account.</span>
      <button
        onClick={onResend}
        disabled={isSending || sent}
        className="ml-auto shrink-0 font-medium underline hover:no-underline disabled:opacity-50"
      >
        {sent ? "Email sent" : isSending ? "Sending..." : "Resend email"}
      </button>
    </div>
  );
}
