"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Package, Settings, LogOut } from "lucide-react";
import { useAuthController } from "@/controllers/useAuthController";

export function ProfileDropdown() {
  const { user, logout } = useAuthController();
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
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-9 h-9 rounded-full overflow-hidden bg-primary text-primary-foreground flex items-center justify-center text-sm font-normal"
        aria-label="Open profile menu"
      >
        {user.image ? (
          <Image src={user.image} alt={user.name} width={36} height={36} className="object-cover" />
        ) : (
          initials
        )}
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
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link
            href="/orders"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background"
          >
            <Package size={16} /> Orders
          </Link>
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-background"
          >
            <Settings size={16} /> Settings
          </Link>
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-background"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
