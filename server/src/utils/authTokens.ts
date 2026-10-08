import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "../models/User";

export function signAccessToken(id: string, role: UserRole, authenticatedAt?: number): string {
  return jwt.sign({ id, role, purpose: "access", ...(authenticatedAt === undefined ? {} : { authenticatedAt }) }, process.env.JWT_SECRET as string, {
    algorithm: "HS256",
    jwtid: crypto.randomUUID(),
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  });
}

export function verifyTypedToken(token: string, purpose: "access" | "2fa"): jwt.JwtPayload {
  const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ["HS256"] });
  if (
    typeof decoded === "string" || decoded.purpose !== purpose ||
    typeof decoded.id !== "string" || !/^[a-fA-F0-9]{24}$/.test(decoded.id) ||
    typeof decoded.exp !== "number" || !Number.isFinite(decoded.exp)
  ) {
    throw new Error("Invalid token claims");
  }
  return decoded;
}

export function verifyAccessToken(token: string): { id: string; role: UserRole; authenticatedAt?: number } {
  const decoded = verifyTypedToken(token, "access");
  if (!["user", "coadmin", "admin"].includes(decoded.role)) {
    throw new Error("Invalid token role");
  }
  return { id: decoded.id, role: decoded.role,
    ...(Number.isSafeInteger(decoded.authenticatedAt) ? { authenticatedAt: decoded.authenticatedAt } : {}),
  };
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
