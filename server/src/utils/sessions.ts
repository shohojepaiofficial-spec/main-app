import crypto from "node:crypto";
import type { Request } from "express";
import { AuthSession } from "../models/AuthSession";
import { clientIp } from "../middleware/clientIp";
import { alertIfNewDevice } from "./signInAlert";
import { User } from "../models/User";
import { hashToken, SESSION_SECONDS, signAccessToken, signRefreshToken, verifyAccessToken, verifyTypedToken } from "./authTokens";

export class SessionError extends Error {
  status = 401;
  code = "SESSION_REVOKED";
  constructor() { super("Your session has ended. Please sign in again."); }
}

export interface SessionDevice { userAgent?: string; ip?: string }

// Where a sign-in came from, for the active-sessions list and new-device
// alerts. Only meaningful on requests relayed from the browser by the
// Next.js proxy (which forwards User-Agent and the signed client IP).
export function sessionDevice(req: Request): SessionDevice {
  if (typeof req.get !== "function") return {};
  return { userAgent: req.get("user-agent")?.slice(0, 300) || undefined, ip: clientIp(req).slice(0, 64) || undefined };
}

export async function createSession(user: InstanceType<typeof User>, authenticatedAt?: number, device: SessionDevice = {}) {
  const sid = crypto.randomUUID();
  const version = user.sessionVersion ?? 0;
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const claims = { sid, version };
  const refreshToken = signRefreshToken(user.id, claims, expiresAt);
  await AuthSession.create({ _id: sid, user: user.id, version, authenticatedAt,
    refreshTokenHash: hashToken(refreshToken), expiresAt: new Date(expiresAt * 1000), ...device, lastUsedAt: new Date() });
  if (device.userAgent) alertIfNewDevice(user, sid, device);
  return { token: signAccessToken(user.id, user.role, authenticatedAt, claims), refreshToken };
}

export async function isSessionActive(claims: ReturnType<typeof verifyAccessToken>) {
  const [session, user] = await Promise.all([
    AuthSession.exists({ _id: claims.sid, user: claims.id, version: claims.version, revokedAt: null, expiresAt: { $gt: new Date() } }),
    User.findById(claims.id).select("sessionVersion"),
  ]);
  return !!session && !!user && (user.sessionVersion ?? 0) === claims.version;
}

export async function revokeSession(sid: string, userId: string) {
  await AuthSession.updateOne({ _id: sid, user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function rotateSession(refreshToken: string, device: SessionDevice = {}) {
  let claims: ReturnType<typeof verifyTypedToken>;
  try { claims = verifyTypedToken(refreshToken, "refresh"); } catch { throw new SessionError(); }
  const user = await User.findById(claims.id);
  if (!user || (user.sessionVersion ?? 0) !== claims.version) throw new SessionError();
  const nextRefreshToken = signRefreshToken(user.id, { sid: claims.sid, version: claims.version }, claims.exp!);
  const session = await AuthSession.findOneAndUpdate({
    _id: claims.sid, user: user.id, version: claims.version,
    refreshTokenHash: hashToken(refreshToken), revokedAt: null, expiresAt: { $gt: new Date() },
  }, { $set: { refreshTokenHash: hashToken(nextRefreshToken), lastUsedAt: new Date() } }, { returnDocument: "after" });
  if (!session) {
    // A correctly signed but spent refresh token proves replay, so revoke
    // its session as well as refusing to mint any more credentials.
    await revokeSession(claims.sid, user.id);
    throw new SessionError();
  }
  // Google sign-ins are created server-to-server (oauth-sync), so the
  // browser is first seen on the hand-off refresh: record it there once.
  if (!session.userAgent && device.userAgent) {
    const claimed = await AuthSession.updateOne({ _id: claims.sid, userAgent: { $exists: false } }, { $set: device });
    if (claimed.modifiedCount) alertIfNewDevice(user, claims.sid, device);
  }
  return { token: signAccessToken(user.id, user.role, session.authenticatedAt ?? undefined, { sid: claims.sid, version: claims.version }),
    refreshToken: nextRefreshToken, user };
}
