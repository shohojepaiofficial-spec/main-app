"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import * as authService from "@/services/authService";

type Status = "checking" | "success" | "error";

export function VerifyEmailView({ token }: { token: string | null }) {
  const [status, setStatus] = useState<Status>(token ? "checking" : "error");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    authService
      .verifyEmail(token)
      .then(() => {
        if (!ignore) setStatus("success");
      })
      .catch((err) => {
        if (ignore) return;
        setStatus("error");
        setMessage(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "This verification link is invalid or has expired."
        );
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <main className="mx-auto max-w-sm px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)] text-center">
      {status === "checking" && (
        <>
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-muted" />
          <p className="text-sm text-muted">Verifying your email...</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 size={40} className="mx-auto mb-3 text-primary" />
          <h1 className="mb-1 text-xl font-semibold">Email verified</h1>
          <p className="mb-4 text-sm text-muted">You&apos;re all set.</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle size={40} className="mx-auto mb-3 text-red-600" />
          <h1 className="mb-1 text-xl font-semibold">Couldn&apos;t verify email</h1>
          <p className="mb-4 text-sm text-muted">
            {message || "This link is missing its token — copy the full link from your email."}
          </p>
        </>
      )}
      <Link href="/dashboard" className="text-sm font-medium text-primary underline">
        Go to your dashboard
      </Link>
    </main>
  );
}
