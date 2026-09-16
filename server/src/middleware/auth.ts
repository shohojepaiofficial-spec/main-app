import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Permission } from "../utils/permissions";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
    };
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

// Like `protect`, but never rejects the request — attaches userId/userRole
// when a valid token is present, otherwise just proceeds anonymously. For
// routes that must work for guests but still want to attribute the request
// to a logged-in user when there is one (see analyticsController#trackEvent).
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET as string) as {
        id: string;
        role: string;
      };
      req.userId = decoded.id;
      req.userRole = decoded.role;
    } catch {
      // invalid/expired token — proceed as anonymous rather than failing
    }
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
    const allowed = !!user && (user.role === "admin" || user.permissions.includes(permission));
    if (!allowed) {
      return res.status(403).json({ message: "You don't have permission to do this" });
    }
    next();
  };
};
