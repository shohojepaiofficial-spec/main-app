// The delegable permissions a coadmin can be granted. Full admins bypass this
// list entirely (see middleware/auth.ts#authorize) — user/role management
// itself is intentionally NOT delegable, so a coadmin can never grant
// themselves (or anyone else) more access than they were given.
export const PERMISSIONS = [
  "products:manage",
  "orders:manage",
  "banners:manage",
  "promotions:manage",
  "analytics:manage",
  "ads:manage",
  "marketing:manage",
  "messages:manage",
  "reviews:manage",
  "translations:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const isPermission = (value: unknown): value is Permission =>
  typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
