"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthController } from "@/controllers/useAuthController";
import { helpForPath } from "@/lib/pageHelp";

// The "About this page" panel in the dashboard layout. `/dashboard` shows
// staff or customer help by the same rule as views/DashboardHome.tsx.
export function usePageHelp() {
  const pathname = usePathname();
  const { hasPermission } = useAuthController();
  const [isOpen, setIsOpen] = useState(false);
  const isStaffDashboard = hasPermission("orders:manage") || hasPermission("products:manage");
  const help = helpForPath(pathname, isStaffDashboard);

  return { help, isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}
