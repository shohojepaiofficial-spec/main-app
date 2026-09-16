"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import * as authService from "@/services/authService";

type Status = "checking" | "success" | "error";

export function UnsubscribeView({ uid, token }: { uid: string | null; token: string | null }) {
  const [status, setStatus] = useState<Status>(uid && token ? "checking" : "error");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!uid || !token) return;
    let ignore = false;
    authService
      .unsubscribeFromMarketing(uid, token)
      .then(() => {
        if (!ignore) setStatus("success");
      })
      .catch((err) => {
        if (ignore) return;
        setStatus("error");
        setMessage(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "This unsubscribe link is invalid or has expired."
        );
      });
    return () => {
      ignore = true;
    };
  }, [uid, token]);

  return (
    <main className="mx-auto max-w-sm px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)] text-center">
      {status === "checking" && (
        <>
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-muted" />
          <p className="text-sm text-muted">Unsubscribing...</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 size={40} className="mx-auto mb-3 text-primary" />
          <h1 className="mb-1 text-xl font-semibold">You&apos;re unsubscribed</h1>
          <p className="mb-4 text-sm text-muted">
            You won&apos;t get any more marketing emails from us. You can turn them back on any
            time from Settings.
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle size={40} className="mx-auto mb-3 text-red-600" />
          <h1 className="mb-1 text-xl font-semibold">Couldn&apos;t unsubscribe</h1>
          <p className="mb-4 text-sm text-muted">
            {message || "This link is missing its token — copy the full link from your email."}
          </p>
        </>
      )}
      <Link href="/" className="text-sm font-medium text-primary underline">
        Back to store
      </Link>
    </main>
  );
}
