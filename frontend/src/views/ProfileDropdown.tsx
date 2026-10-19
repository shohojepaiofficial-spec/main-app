"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Package, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuthController } from "@/controllers/useAuthController";
import { useTranslations } from "@/controllers/useTranslations";

export function ProfileDropdown() {
  const { user, logout } = useAuthController();
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      {/* Label + arrow so it's clear this opens a menu, not just an avatar. */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-0.5 pr-2.5 text-primary hover:bg-primary/20"
        aria-label={t("nav.openAccountMenu", "Open account menu")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-sm font-normal">
          {user.image ? (
            <Image src={user.image} alt="" width={32} height={32} className="object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="hidden text-sm font-medium sm:inline">{t("nav.account", "Account")}</span>
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-surface shadow-lg py-1 z-40">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-normal truncate">{user.name}</p>
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background"
          >
            <LayoutDashboard size={16} /> {t("nav.dashboard", "Dashboard")}
          </Link>
          <Link
            href="/orders"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background"
          >
            <Package size={16} /> {t("nav.orders", "Orders")}
          </Link>
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background"
          >
            <Settings size={16} /> {t("nav.settings", "Settings")}
          </Link>
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-background"
          >
            <LogOut size={16} /> {t("nav.logout", "Log out")}
          </button>
        </div>
      )}
    </div>
  );
}
