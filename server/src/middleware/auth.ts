import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/authTokens";
import { User } from "../models/User";
import { Permission } from "../utils/permissions";
import { isSessionActive } from "../utils/sessions";
import { TokenExpiredError } from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  authenticatedAt?: number;
  sessionId?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = header.split(" ")[1];

  let decoded: ReturnType<typeof verifyAccessToken>;
  try {
    // A valid signature alone does not make a 2FA challenge a session.
    decoded = verifyAccessToken(token);
  } catch (error) {
    return res.status(401).json({ code: error instanceof TokenExpiredError ? "ACCESS_TOKEN_EXPIRED" : "INVALID_ACCESS_TOKEN", message: "Not authorized, invalid or expired token" });
  }
  try {
    if (!await isSessionActive(decoded)) return res.status(401).json({ code: "SESSION_REVOKED", message: "Your session has ended. Please sign in again." });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.authenticatedAt = decoded.authenticatedAt;
    req.sessionId = decoded.sid;
    next();
  } catch (error) {
    next(error);
  }
};

// Like `protect`, but never rejects the request — attaches userId/userRole
// when a valid token is present, otherwise just proceeds anonymously. For
// routes that must work for guests but still want to attribute the request
// to a logged-in user when there is one (see analyticsController#trackEvent).
export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    let decoded: ReturnType<typeof verifyAccessToken>;
    try { decoded = verifyAccessToken(header.split(" ")[1]); } catch { return next(); }
    try {
      if (await isSessionActive(decoded)) {
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.sessionId = decoded.sid;
      }
    } catch (error) { return next(error); }
  }
  next();
};

// Re-checks the DB rather than trusting the JWT's `role` claim, so a demoted
// admin is blocked immediately instead of staying "admin" until their token
// expires. Reserved for user/role/permission management — never delegated to
// coadmins, so a coadmin can never escalate their own or anyone else's access.
export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.userId).select("role");
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Admin, or a coadmin holding the given permission. Same DB-freshness
// guarantee as adminOnly: revoking a permission takes effect on the next
// request, not on the coadmin's next login.
export const authorize = (permission: Permission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = await User.findById(req.userId).select("role permissions");
    const allowed = !!user && (user.role === "admin" || (user.role === "coadmin" && user.permissions.includes(permission)));
    if (!allowed) {
      return res.status(403).json({ message: "You don't have permission to do this" });
    }
    next();
  };
};
