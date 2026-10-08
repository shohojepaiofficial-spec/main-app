import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "../models/User";

export interface SessionClaims { sid: string; version: number }
export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export function signAccessToken(id: string, role: UserRole, authenticatedAt?: number, session?: SessionClaims): string {
  if (!session) throw new Error("Access tokens require a server-side session");
  return jwt.sign({ id, role, purpose: "access", ...session, ...(authenticatedAt === undefined ? {} : { authenticatedAt }) }, process.env.JWT_SECRET as string, {
    algorithm: "HS256",
    jwtid: crypto.randomUUID(),
    expiresIn: ACCESS_TOKEN_SECONDS,
  });
}

export function verifyTypedToken(token: string, purpose: "access" | "2fa" | "refresh"): jwt.JwtPayload {
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ["HS256"] });
  if (
    typeof decoded === "string" || decoded.purpose !== purpose ||
    typeof decoded.id !== "string" || !/^[a-fA-F0-9]{24}$/.test(decoded.id) ||
    typeof decoded.exp !== "number" || !Number.isFinite(decoded.exp) ||
    !Number.isSafeInteger(decoded.version) || decoded.version < 0 ||
    (purpose !== "2fa" && (typeof decoded.sid !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded.sid)))
  ) {
    throw new Error("Invalid token claims");
  }
  return decoded;
}

export function verifyAccessToken(token: string): { id: string; role: UserRole; authenticatedAt?: number } & SessionClaims {
  const decoded = verifyTypedToken(token, "access");
  if (!["user", "coadmin", "admin"].includes(decoded.role)) {
    throw new Error("Invalid token role");
  }
  return { id: decoded.id, role: decoded.role, sid: decoded.sid, version: decoded.version,
    ...(Number.isSafeInteger(decoded.authenticatedAt) ? { authenticatedAt: decoded.authenticatedAt } : {}),
  };
}

export function signRefreshToken(id: string, session: SessionClaims, expiresAt: number): string {
  return jwt.sign({ id, ...session, purpose: "refresh", exp: expiresAt }, process.env.JWT_SECRET as string, {
    algorithm: "HS256", jwtid: crypto.randomUUID(),
  });
}

// Used for both email verification and password reset links. The raw token
// goes in the emailed link; only its hash is ever stored, so a database leak
// alone can't be used to verify an email or reset a password — same
// principle as never storing a plaintext password.
export function generateRawAndHash(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
