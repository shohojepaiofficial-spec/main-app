import { Response } from "express";
import { User, UserRole } from "../models/User";
import { PERMISSIONS, isPermission } from "../utils/permissions";
import { AuthRequest } from "../middleware/auth";
import { escapeRegex } from "../utils/regex";

// "admin" is deliberately excluded: there is exactly one admin at a time,
// set only by the promote-admin bootstrap script (which transfers the role
// rather than adding a second one). This endpoint can only ever move
// someone between "user" and "coadmin".
const ASSIGNABLE_ROLES: UserRole[] = ["user", "coadmin"];
const ALL_ROLES: UserRole[] = ["user", "coadmin", "admin"];

const DEFAULT_PAGE_SIZE = 20;

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

// Same paginated `{ items, total, page, totalPages }` shape as getProducts —
// this list has no upper bound (every signed-up customer, not just
// admin-created records), so it needed the same treatment once a real store
// accumulates more than a page's worth of accounts.
export const getUsers = async (req: AuthRequest, res: Response) => {
  const { search, role, permission, dateFrom, dateTo } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};

  if (search) filter.email = { $regex: escapeRegex(search), $options: "i" };
  if (role && (ALL_ROLES as string[]).includes(role)) filter.role = role;
  if (permission && isPermission(permission)) filter.permissions = permission;

  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      // Inclusive of the whole end day, not just midnight at its start.
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.$lte = end;
    }
    filter.createdAt = createdAt;
  }

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || DEFAULT_PAGE_SIZE));

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    items: items.map(shapeUser),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
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
