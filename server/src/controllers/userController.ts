import { validateControllerInput } from "../middleware/controllerInput";
import { Response } from "express";
import { MAX_ADMINS, User, UserRole } from "../models/User";
import { PERMISSIONS, isPermission } from "../utils/permissions";
import { AuthRequest } from "../middleware/auth";
import { escapeRegex } from "../utils/regex";
import { notifyRoleChange } from "../utils/roleChangeEmail";

// Any role can be assigned here, but there are never more than MAX_ADMINS
// admins at once (checked in updateUserAccess).
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
  validateControllerInput("getUsers", req);
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

// Admin-only (see routes/userRoutes.ts) — any admin can change anyone else's
// role (including promoting or demoting another admin) and,
// for coadmins, which of PERMISSIONS they hold. A user's own access can't be
// changed here so an admin can't accidentally lock themselves out.
export const updateUserAccess = async (req: AuthRequest, res: Response) => {
  validateControllerInput("updateUserAccess", req);
  const { role, permissions } = req.body as { role?: UserRole; permissions?: unknown };

  if (req.params.id === req.userId) {
    return res.status(400).json({ message: "You can't change your own access" });
  }

  if (role !== undefined && !ALL_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const tooManyAdmins = { message: `There can be at most ${MAX_ADMINS} admins — demote one first` };
  const target = await User.findById(req.params.id).select("role");
  if (!target) return res.status(404).json({ message: "User not found" });
  const promotingToAdmin = role === "admin" && target.role !== "admin";
  if (promotingToAdmin && (await User.countDocuments({ role: "admin" })) >= MAX_ADMINS) {
    return res.status(400).json(tooManyAdmins);
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
  if (update.role === "user") Object.assign(update, { twoFactor: { enabled: false } });

  const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: "after" });
  if (!user) return res.status(404).json({ message: "User not found" });

  // Two admins promoting different people at the same moment could both pass
  // the count check above, so recount and undo this promotion if it overshot.
  if (promotingToAdmin && (await User.countDocuments({ role: "admin" })) > MAX_ADMINS) {
    await User.updateOne({ _id: user._id, role: "admin" }, { role: target.role, permissions: [] });
    return res.status(409).json(tooManyAdmins);
  }

  // Both the admin who made the change and the person whose role changed
  // are always emailed. Permission-only edits don't send anything.
  if (role !== undefined && role !== target.role) {
    notifyRoleChange(req.userId, { name: user.name, email: user.email }, target.role, role);
  }

  res.json(shapeUser(user));
};
