import crypto from "node:crypto";
import { AuthSession } from "../models/AuthSession";
import { User } from "../models/User";
import { hashToken, SESSION_SECONDS, signAccessToken, signRefreshToken, verifyAccessToken, verifyTypedToken } from "./authTokens";

export class SessionError extends Error {
  status = 401;
  code = "SESSION_REVOKED";
  constructor() { super("Your session has ended. Please sign in again."); }
}

export async function createSession(user: InstanceType<typeof User>, authenticatedAt?: number) {
  const sid = crypto.randomUUID();
  const version = user.sessionVersion ?? 0;
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const claims = { sid, version };
  const refreshToken = signRefreshToken(user.id, claims, expiresAt);
  await AuthSession.create({ _id: sid, user: user.id, version, authenticatedAt,
    refreshTokenHash: hashToken(refreshToken), expiresAt: new Date(expiresAt * 1000) });
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

export async function rotateSession(refreshToken: string) {
  let claims: ReturnType<typeof verifyTypedToken>;
  try { claims = verifyTypedToken(refreshToken, "refresh"); } catch { throw new SessionError(); }
  const user = await User.findById(claims.id);
  if (!user || (user.sessionVersion ?? 0) !== claims.version) throw new SessionError();
  const nextRefreshToken = signRefreshToken(user.id, { sid: claims.sid, version: claims.version }, claims.exp!);
  const session = await AuthSession.findOneAndUpdate({
    _id: claims.sid, user: user.id, version: claims.version,
    refreshTokenHash: hashToken(refreshToken), revokedAt: null, expiresAt: { $gt: new Date() },
  }, { $set: { refreshTokenHash: hashToken(nextRefreshToken) } }, { new: true });
  if (!session) {
    // A correctly signed but spent refresh token proves replay, so revoke
    // its session as well as refusing to mint any more credentials.
    await revokeSession(claims.sid, user.id);
    throw new SessionError();
  }
  return { token: signAccessToken(user.id, user.role, session.authenticatedAt ?? undefined, { sid: claims.sid, version: claims.version }),
    refreshToken: nextRefreshToken, user };
}
