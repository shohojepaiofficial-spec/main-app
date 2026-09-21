"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  Boxes,
  ClipboardList,
  GalleryHorizontal,
  Tag,
  BarChart3,
  Megaphone,
  Mail,
  Inbox,
  Languages,
  LogOut,
  ArrowLeft,
  Menu,
} from "lucide-react";
import { useAuthController } from "@/controllers/useAuthController";
import { Modal } from "@/components/ui/Modal";

// Every logged-in account gets these — their own orders/settings, not the
// admin-wide management screens below.
const ACCOUNT_LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/orders", label: "Orders", Icon: Package },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuthController();
  // On small screens the nav lives behind a "Menu" button (a drawer) instead
  // of sitting permanently on the page — see the mobile bar below.
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Each admin link is gated by the same permission that gates its API
  // routes (see docs/ARCHITECTURE.md's "Roles & permissions"), so a coadmin
  // only ever sees the sections they can actually use. "Manage Users" is
  // admin-only and not permission-based — it's never delegable.
  const adminLinks = [
    hasPermission("products:manage") && {
      href: "/admin/products",
      label: "Manage Products",
      Icon: Boxes,
    },
    hasPermission("orders:manage") && {
      href: "/admin/orders",
      label: "Manage Orders",
      Icon: ClipboardList,
    },
    hasPermission("banners:manage") && {
      href: "/admin/banners",
      label: "Manage Banners",
      Icon: GalleryHorizontal,
    },
    hasPermission("promotions:manage") && {
      href: "/admin/promotions",
      label: "Promo Codes",
      Icon: Tag,
    },
    hasPermission("analytics:manage") && {
      href: "/admin/analytics",
      label: "Analytics",
      Icon: BarChart3,
    },
    hasPermission("ads:manage") && {
      href: "/admin/ads",
      label: "Social Media Ads",
      Icon: Megaphone,
    },
    hasPermission("marketing:manage") && {
      href: "/admin/campaigns",
      label: "Marketing Campaigns",
      Icon: Mail,
    },
    hasPermission("messages:manage") && {
      href: "/admin/messages",
      label: "Messages",
      Icon: Inbox,
    },
    hasPermission("translations:manage") && {
      href: "/admin/translations",
      label: "Translations",
      Icon: Languages,
    },
    user?.role === "admin" && {
      href: "/admin/users",
      label: "Manage Users",
      Icon: ShieldCheck,
    },
  ].filter((link): link is { href: string; label: string; Icon: typeof ShieldCheck } => !!link);

  const renderLink = ({ href, label, Icon }: (typeof adminLinks)[number]) => {
    const isActive = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
          isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background"
        }`}
      >
        <Icon size={16} /> {label}
      </Link>
    );
  };

  const navLinks = (
    <nav className="flex flex-col gap-1 p-2">
      {ACCOUNT_LINKS.map(renderLink)}

      {adminLinks.length > 0 && (
        <>
          <p className="px-3 pt-3 pb-1 text-xs font-medium uppercase text-muted">Admin</p>
          {adminLinks.map(renderLink)}
        </>
      )}

      <button
        onClick={() => {
          setIsMobileOpen(false);
          logout();
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-background"
      >
        <LogOut size={16} /> Log out
      </button>
    </nav>
  );

  return (
    <>
      {/* Small screens: a slim top bar with a button that opens the nav as a
          drawer, instead of the nav permanently taking up page space. */}
      <div className="flex items-center justify-between border-b border-border bg-surface p-4 md:hidden print:hidden">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={14} /> Back to store
        </Link>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
        >
          <Menu size={16} /> Menu
        </button>
      </div>

      <Modal
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        title={user?.name ?? "Menu"}
        widthClassName="max-w-xs"
      >
        {navLinks}
      </Modal>

      {/* md and up: the nav sits permanently as a sticky sidebar. */}
      <aside className="hidden shrink-0 border-border bg-surface md:sticky md:top-0 md:block md:h-screen md:w-60 md:self-start md:overflow-y-auto md:border-r print:hidden">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <ArrowLeft size={14} /> Back to store
          </Link>
          {user && <p className="mt-3 text-sm font-medium truncate">{user.name}</p>}
        </div>

        {navLinks}
      </aside>
    </>
  );
}
