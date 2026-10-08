import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import type { User } from "@/models";

export interface SessionCredentials { token: string; refreshToken: string; user: User }
export const SESSION_SYNC_KEY = "auth-session-sync";
const API_URL = "/api/backend";
const listeners = new Set<(session: SessionCredentials | null) => void>();
let refreshFlight: Promise<SessionCredentials | null> | null = null;

export function tokenIsFresh(token: string | undefined | null, marginSeconds = 0) {
  try { return !!token && jwtDecode<{ exp: number }>(token).exp * 1000 > Date.now() + marginSeconds * 1000; }
  catch { return false; }
}

export function readSessionCookies(): SessionCredentials | null {
  try {
    const token = Cookies.get("token"), refreshToken = Cookies.get("refreshToken"), user = Cookies.get("user");
    if (token && !token.startsWith("ui.") || refreshToken && !refreshToken.startsWith("ui.")) {
      for (const name of ["token", "refreshToken", "user"]) Cookies.remove(name);
      return null;
    }
    return token && refreshToken && user ? { token, refreshToken, user: JSON.parse(user) as User } : null;
  } catch { return null; }
}

export function subscribeSession(listener: (session: SessionCredentials | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writeSessionCookies(session: SessionCredentials | null) {
  // These are unsigned UI markers from the proxy, not backend credentials.
  if (session) {
    const expires = new Date(jwtDecode<{ exp: number }>(session.refreshToken).exp * 1000);
    const options = { expires, sameSite: "strict" as const, secure: typeof location !== "undefined" && location.protocol === "https:" };
    Cookies.set("token", session.token, options);
    Cookies.set("refreshToken", session.refreshToken, options);
    Cookies.set("user", JSON.stringify(session.user), options);
  } else {
    for (const name of ["token", "refreshToken", "user"]) Cookies.remove(name);
  }
  for (const listener of listeners) listener(session);
  // No credentials in localStorage; this only tells other tabs to reread cookies.
  try { localStorage.setItem(SESSION_SYNC_KEY, `${Date.now()}-${Math.random()}`); } catch { /* storage may be disabled */ }
}

export async function withSessionLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request("backend-session", work);
  return work();
}

async function refreshUnderLock(rejectedToken?: string): Promise<SessionCredentials | null> {
  const current = readSessionCookies();
  if (!current) return null;
  if (tokenIsFresh(current.token, 30) && (!rejectedToken || current.token !== rejectedToken)) return current;
  if (!tokenIsFresh(current.refreshToken)) { writeSessionCookies(null); return null; }
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Requested-With": "ecommerce" },
    body: JSON.stringify({ refreshToken: current.refreshToken }), signal: AbortSignal.timeout(10_000),
  });
  // Never restore an earlier account or a logged-out session after a late response.
  if (Cookies.get("refreshToken") !== current.refreshToken) throw new Error("Session changed during refresh");
  if (response.status === 401) { writeSessionCookies(null); return null; }
  if (!response.ok) throw new Error("Unable to refresh your session. Please try again.");
  const session = await response.json() as SessionCredentials;
  if (!tokenIsFresh(session.token) || !tokenIsFresh(session.refreshToken) || session.user?.id !== current.user.id) {
    throw new Error("Invalid session refresh response");
  }
  if (Cookies.get("refreshToken") !== current.refreshToken) throw new Error("Session changed during refresh");
  writeSessionCookies(session);
  return session;
}

export async function ensureSession(rejectedToken?: string): Promise<SessionCredentials | null> {
  if (!refreshFlight) refreshFlight = withSessionLock(() => refreshUnderLock(rejectedToken)).finally(() => { refreshFlight = null; });
  return refreshFlight;
}

export async function endSession(allDevices = false) {
  await refreshFlight;
  return withSessionLock(async () => {
    const session = await refreshUnderLock();
    if (!session) { writeSessionCookies(null); return; }
    const response = await fetch(`${API_URL}/auth/${allDevices ? "logout-all" : "logout"}`, {
      method: "POST", headers: { "X-Requested-With": "ecommerce" }, signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok && response.status !== 401) throw new Error("Logout could not be confirmed. Please try again.");
    if (Cookies.get("refreshToken") === session.refreshToken) writeSessionCookies(null);
  });
}
