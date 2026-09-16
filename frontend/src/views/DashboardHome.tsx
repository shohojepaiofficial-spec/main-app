"use client";

import { useAuthController } from "@/controllers/useAuthController";
import { AdminDashboardOverview } from "@/views/AdminDashboardOverview";
import { DashboardOverview } from "@/views/DashboardOverview";

// `/dashboard` used to show the exact same customer "my orders" view to
// every role. An admin or a coadmin holding at least one relevant permission
// now gets an operational overview instead (pending orders, low stock,
// revenue) — see views/AdminDashboardOverview.tsx. A coadmin with no
// relevant permission at all still falls back to the customer view, since an
// overview with nothing to show would be worse than no overview.
export function DashboardHome() {
  const { hasPermission } = useAuthController();
  const isAdminLike = hasPermission("orders:manage") || hasPermission("products:manage");
  return isAdminLike ? <AdminDashboardOverview /> : <DashboardOverview />;
}
