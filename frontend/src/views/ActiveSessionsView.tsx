"use client";

import { ActiveSession } from "@/models";
import { useTranslations } from "@/controllers/useTranslations";

interface ActiveSessionsViewProps {
  sessions: ActiveSession[];
  isLoading: boolean;
  loadFailed: boolean;
  revokingId: string | null;
  endingAll: boolean;
  onRevoke: (session: ActiveSession) => void;
  onRetry: () => void;
  onSignOutAll: () => void;
}

export function ActiveSessionsView({ sessions, isLoading, loadFailed, revokingId, endingAll, onRevoke, onRetry, onSignOutAll }: ActiveSessionsViewProps) {
  const { t, locale } = useTranslations();
  const formatDate = (value: string) =>
    new Date(value).toLocaleString(locale === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <section aria-labelledby="active-sessions-heading" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div>
        <h2 id="active-sessions-heading" className="text-sm font-semibold">{t("sessions.title", "Active sessions")}</h2>
        <p className="mt-1 text-xs text-muted">
          {t("sessions.description", "Browsers and devices signed in to your account. Sign out any you don't recognise, then change your password.")}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">{t("sessions.loading", "Loading sessions...")}</p>
      ) : loadFailed ? (
        <p className="text-sm text-muted">
          {t("sessions.loadFailed", "Couldn't load your sessions.")}{" "}
          <button type="button" onClick={onRetry} className="underline">{t("sessions.retry", "Try again")}</button>
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {session.browser ?? t("sessions.unknownBrowser", "Unknown browser")}
                  {session.os && ` · ${session.os}`}
                  {session.current && (
                    <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                      {t("sessions.thisDevice", "This device")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {t("sessions.lastActive", "Last active {date}", { date: formatDate(session.lastActiveAt) })}
                  {" · "}
                  {t("sessions.signedIn", "Signed in {date}", { date: formatDate(session.signedInAt) })}
                  {session.ip && ` · ${session.ip}`}
                </p>
              </div>
              {!session.current && (
                <button
                  type="button"
                  disabled={revokingId === session.id}
                  onClick={() => onRevoke(session)}
                  className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-50"
                >
                  {revokingId === session.id ? t("sessions.revoking", "Signing out...") : t("sessions.revoke", "Sign out")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={endingAll}
        onClick={onSignOutAll}
        className="self-start rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
      >
        {t("settings.logoutAll", "Sign out on all devices")}
      </button>
    </section>
  );
}
