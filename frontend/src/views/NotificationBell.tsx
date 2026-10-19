"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Bell } from "lucide-react";
import { useNotificationStore } from "@/controllers/useNotificationStore";
import { useTranslations } from "@/controllers/useTranslations";
import { AppNotification } from "@/models";

// The bell: unread count badge, and a dropdown of the latest notifications.
// Data comes from useNotificationStore (kept fresh by
// useNotificationPolling); this only renders and passes clicks back.
// `placement`: "right" opens under the bell from its right edge (navbar,
// phone top bar); "sidebar" opens beside the desktop dashboard sidebar,
// which scrolls and is too narrow to hold the panel without clipping it.
export function NotificationBell({ placement = "right" }: { placement?: "right" | "sidebar" }) {
  const { t } = useTranslations();
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loaded = useNotificationStore((s) => s.loaded);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-background"
        aria-label={
          unreadCount > 0
            ? t("notifications.openWithUnread", "Notifications, {n} unread", { n: unreadCount })
            : t("notifications.open", "Notifications")
        }
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {badge}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`${placement === "sidebar" ? "fixed left-[15.5rem] top-4" : "absolute right-0 mt-2"} z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-surface shadow-lg`}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">{t("notifications.title", "Notifications")}</p>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()} className="text-xs font-medium text-primary hover:underline">
                {t("notifications.markAllRead", "Mark all as read")}
              </button>
            )}
          </div>

          <ul className="max-h-[min(26rem,70vh)] overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-muted">
                {loaded ? t("notifications.empty", "No notifications yet") : t("notifications.loading", "Loading...")}
              </li>
            )}
            {items.map((n) => (
              <NotificationRow
                key={n._id}
                notification={n}
                onOpen={() => {
                  markRead(n._id);
                  setIsOpen(false);
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification: n, onOpen }: { notification: AppNotification; onOpen: () => void }) {
  const unread = !n.readAt;
  const content = (
    <div className="flex gap-2.5">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${unread ? "font-semibold" : "font-medium text-muted"}`}>{n.title}</p>
        <p className="mt-0.5 text-xs text-muted">{n.body}</p>
        <p className="mt-1 text-[11px] text-muted">
          {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
  const className = `block w-full border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-background ${unread ? "bg-primary/5" : ""}`;

  return (
    <li>
      {n.link ? (
        <Link href={n.link} onClick={onOpen} className={className}>
          {content}
        </Link>
      ) : (
        <button onClick={onOpen} className={className}>
          {content}
        </button>
      )}
    </li>
  );
}
