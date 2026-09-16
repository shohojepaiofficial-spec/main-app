import { Response } from "express";
import { User, UserRole } from "../models/User";
import { PERMISSIONS, isPermission } from "../utils/permissions";
import { AuthRequest } from "../middleware/auth";

// "admin" is deliberately excluded: there is exactly one admin at a time,
// set only by the promote-admin bootstrap script (which transfers the role
// rather than adding a second one). This endpoint can only ever move
// someone between "user" and "coadmin".
const ASSIGNABLE_ROLES: UserRole[] = ["user", "coadmin"];

const shapeUser = (user: InstanceType<typeof User>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: user.permissions,
  provider: user.provider,
  image: user.image,
  createdAt: user.createdAt,
});

export const getUsers = async (_req: AuthRequest, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map(shapeUser));
};

// Admin-only (see routes/userRoutes.ts) — grants/revokes a user's role and,
// for coadmins, which of PERMISSIONS they hold. A user's own access can't be
// changed here so an admin can't accidentally lock themselves out.
export const updateUserAccess = async (req: AuthRequest, res: Response) => {
  const { role, permissions } = req.body as { role?: UserRole; permissions?: unknown };

  if (req.params.id === req.userId) {
    return res.status(400).json({ message: "You can't change your own access" });
  }

  if (role !== undefined && !ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({
      message:
        role === "admin"
          ? "There is only one admin — use the promote-admin script to transfer that role"
          : "Invalid role",
    });
  }

  if (permissions !== undefined) {
    if (!Array.isArray(permissions) || !permissions.every(isPermission)) {
      return res.status(400).json({ message: "Invalid permissions" });
    }
  }

  const update: Partial<{ role: UserRole; permissions: typeof PERMISSIONS[number][] }> = {};
  if (role !== undefined) update.role = role;
  if (permissions !== undefined) update.permissions = permissions as typeof PERMISSIONS[number][];
  // Only coadmins hold a permission set — admins implicitly have everything,
  // plain users have nothing, so keep the stored array clean.
  if (update.role && update.role !== "coadmin") update.permissions = [];

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(shapeUser(user));
};
