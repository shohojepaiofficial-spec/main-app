"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import * as authService from "@/services/authService";
import { useAuthStore } from "@/controllers/useAuthStore";
import { useTranslations } from "@/controllers/useTranslations";

type Status = "checking" | "success" | "error";

export function VerifyEmailView({ token }: { token: string | null }) {
  const [status, setStatus] = useState<Status>(token ? "checking" : "error");
  const [message, setMessage] = useState("");
  const { t } = useTranslations();

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    authService
      .verifyEmail(token)
      .then(() => {
        if (ignore) return;
        setStatus("success");
        // If this same browser is already logged in (e.g. the account that
        // just clicked "Resend email" from EmailVerificationBanner), flip
        // its cached isEmailVerified now rather than leaving the banner
        // showing — and the "Resend email" option along with it — until
        // the next full page load happens to re-sync it (see
        // useRefreshUser, which only runs once per load).
        const currentUser = useAuthStore.getState().user;
        if (currentUser && !currentUser.isEmailVerified) {
          useAuthStore.getState().updateUser({ ...currentUser, isEmailVerified: true });
        }
      })
      .catch((err) => {
        if (ignore) return;
        setStatus("error");
        setMessage(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            t("auth.verifyLinkInvalid", "This verification link is invalid or has expired.")
        );
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main className="mx-auto max-w-sm px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)] text-center">
      {status === "checking" && (
        <>
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-muted" />
          <p className="text-sm text-muted">{t("auth.verifyingEmail", "Verifying your email...")}</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 size={40} className="mx-auto mb-3 text-primary" />
          <h1 className="mb-1 text-xl font-semibold">{t("auth.emailVerified", "Email verified")}</h1>
          <p className="mb-4 text-sm text-muted">{t("auth.allSet", "You're all set.")}</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle size={40} className="mx-auto mb-3 text-red-600" />
          <h1 className="mb-1 text-xl font-semibold">{t("auth.couldntVerifyEmail", "Couldn't verify email")}</h1>
          <p className="mb-4 text-sm text-muted">
            {message ||
              t("auth.verifyLinkMissingToken", "This link is missing its token — copy the full link from your email.")}
          </p>
        </>
      )}
      <Link href="/dashboard" className="text-sm font-medium text-primary underline">
        {t("auth.goToDashboard", "Go to your dashboard")}
      </Link>
    </main>
  );
}
