"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as sessionService from "@/services/sessionService";
import { ActiveSession } from "@/models";
import { confirmDialog } from "@/lib/confirm";
import { translateNow } from "@/controllers/useTranslations";

function errorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

// Settings → Active sessions: every browser/device signed in to this
// account, with a per-device sign-out (the current one uses normal Sign out).
export function useActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    sessionService
      .getActiveSessions()
      .then((result) => {
        if (!ignore) { setSessions(result); setLoadFailed(false); }
      })
      .catch(() => {
        if (!ignore) setLoadFailed(true);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const revoke = async (session: ActiveSession) => {
    const ok = await confirmDialog(
      translateNow("sessions.confirmRevoke", "That device will be signed out straight away and will need to sign in again."),
      { title: translateNow("sessions.revokeTitle", "Sign out this device?"), confirmLabel: translateNow("sessions.revoke", "Sign out"), danger: true }
    );
    if (!ok) return;
    setRevokingId(session.id);
    try {
      await sessionService.revokeSession(session.id);
      setSessions((current) => current.filter((s) => s.id !== session.id));
      toast.success(translateNow("sessions.revoked", "Device signed out"));
    } catch (err) {
      toast.error(errorMessage(err, translateNow("sessions.revokeFailed", "Couldn't sign that device out. Please try again.")));
      setReloadKey((k) => k + 1);
    } finally {
      setRevokingId(null);
    }
  };

  return { sessions, isLoading, loadFailed, revokingId, revoke, reload: () => setReloadKey((k) => k + 1) };
}
