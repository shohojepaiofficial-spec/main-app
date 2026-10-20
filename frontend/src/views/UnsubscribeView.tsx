"use client";

import Link from "next/link";
import { CheckCircle2, MailX, XCircle, Loader2 } from "lucide-react";
import { useUnsubscribe } from "@/controllers/useUnsubscribe";

export function UnsubscribeView({ uid, token }: { uid: string | null; token: string | null }) {
  const { status, message, unsubscribe } = useUnsubscribe(uid, token);

  return (
    <main className="mx-auto max-w-sm px-6 pb-16 pt-[calc(var(--navbar-height)+2rem)] text-center">
      {(status === "ready" || status === "working") && (
        <>
          <MailX size={40} className="mx-auto mb-3 text-muted" />
          <h1 className="mb-1 text-xl font-semibold">Unsubscribe from marketing emails?</h1>
          <p className="mb-4 text-sm text-muted">
            You&apos;ll stop getting offers and announcements by email. Order updates still arrive as usual.
          </p>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={status === "working"}
            className="mb-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {status === "working" && <Loader2 size={16} className="animate-spin" />}
            {status === "working" ? "Unsubscribing..." : "Unsubscribe"}
          </button>
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
      <div>
        <Link href="/" className="text-sm font-medium text-primary underline">
          Back to store
        </Link>
      </div>
    </main>
  );
}
