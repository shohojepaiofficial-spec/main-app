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
  MessageSquareReply,
  LogOut,
  ArrowLeft,
  Menu,
} from "lucide-react";
import { useAuthController } from "@/controllers/useAuthController";
import { Modal } from "@/components/ui/Modal";
import { useTranslations } from "@/controllers/useTranslations";

// Every logged-in account gets these — their own orders/settings, not the
// admin-wide management screens below. `key` translates the label (unlike
// adminLinks below, which have none — the admin panel stays English).
type NavLink = { href: string; label: string; key?: string; Icon: typeof ShieldCheck };

const ACCOUNT_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", key: "nav.dashboard", Icon: LayoutDashboard },
  { href: "/orders", label: "Orders", key: "nav.orders", Icon: Package },
  { href: "/settings", label: "Settings", key: "nav.settings", Icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuthController();
  const { t } = useTranslations();
  // On small screens the nav lives behind a "Menu" button (a drawer) instead
  // of sitting permanently on the page — see the mobile bar below.
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Each admin link is gated by the same permission that gates its API
  // routes (see docs/ARCHITECTURE.md's "Roles & permissions"), so a coadmin
  // only ever sees the sections they can actually use. "Users" is
  // admin-only and not permission-based — it's never delegable. Links are
  // grouped by job so the panel scans by section instead of as one long
  // list; a group with nothing visible to this user is dropped entirely.
  const adminGroups: { title: string; links: NavLink[] }[] = [
    {
      title: "Sales",
      links: [
        hasPermission("orders:manage") && { href: "/admin/orders", label: "Orders", Icon: ClipboardList },
        hasPermission("analytics:manage") && { href: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
      ],
    },
    {
      title: "Catalog",
      links: [
        hasPermission("products:manage") && { href: "/admin/products", label: "Products", Icon: Boxes },
        hasPermission("reviews:manage") && { href: "/admin/reviews", label: "Reviews", Icon: MessageSquareReply },
      ],
    },
    {
      title: "Marketing",
      links: [
        hasPermission("banners:manage") && { href: "/admin/banners", label: "Banners", Icon: GalleryHorizontal },
        hasPermission("promotions:manage") && { href: "/admin/promotions", label: "Promo Codes", Icon: Tag },
        hasPermission("ads:manage") && { href: "/admin/ads", label: "Social Media Ads", Icon: Megaphone },
        hasPermission("marketing:manage") && { href: "/admin/campaigns", label: "Email Campaigns", Icon: Mail },
      ],
    },
    {
      title: "Customers",
      links: [
        hasPermission("messages:manage") && { href: "/admin/messages", label: "Messages", Icon: Inbox },
        user?.role === "admin" && { href: "/admin/users", label: "Users", Icon: ShieldCheck },
      ],
    },
    {
      title: "Site",
      links: [
        hasPermission("translations:manage") && { href: "/admin/translations", label: "Translations", Icon: Languages },
      ],
    },
  ]
    .map((group) => ({ ...group, links: group.links.filter((link): link is NavLink => !!link) }))
    .filter((group) => group.links.length > 0);

  const renderLink = ({ href, label, key, Icon }: NavLink) => {
    // Prefix match keeps a section highlighted on its sub-pages too
    // (/admin/orders/123); "/dashboard" stays exact so it doesn't claim them.
    const isActive = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
          isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background"
        }`}
      >
        <Icon size={16} /> {key ? t(key, label) : label}
      </Link>
    );
  };

  const groupHeading = (title: string) => (
    <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
  );

  const navLinks = (
    <nav className="flex flex-col gap-0.5 p-2">
      {adminGroups.length > 0 && groupHeading(t("account.myAccount", "My account"))}
      {ACCOUNT_LINKS.map(renderLink)}

      {adminGroups.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          {groupHeading(group.title)}
          {group.links.map(renderLink)}
        </div>
      ))}

      <div className="mt-3 border-t border-border pt-2">
        <button
          onClick={() => {
            setIsMobileOpen(false);
            logout();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-background"
        >
          <LogOut size={16} /> {t("nav.logout", "Log out")}
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Small screens: a slim top bar with a button that opens the nav as a
          drawer, instead of the nav permanently taking up page space. */}
      <div className="flex items-center justify-between border-b border-border bg-surface p-4 md:hidden print:hidden">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={14} /> {t("account.backToStore", "Back to store")}
        </Link>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
        >
          <Menu size={16} /> {t("account.menu", "Menu")}
        </button>
      </div>

      <Modal
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        title={user?.name ?? t("account.menu", "Menu")}
        widthClassName="max-w-xs"
      >
        {navLinks}
      </Modal>

      {/* md and up: the nav sits permanently as a sticky sidebar. */}
      <aside className="hidden shrink-0 border-border bg-surface md:sticky md:top-0 md:block md:h-screen md:w-60 md:self-start md:overflow-y-auto md:border-r print:hidden">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            <ArrowLeft size={14} /> {t("account.backToStore", "Back to store")}
          </Link>
          {user && <p className="mt-3 text-sm font-medium truncate">{user.name}</p>}
        </div>

        {navLinks}
      </aside>
    </>
  );
}
