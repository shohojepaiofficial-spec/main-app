"use client";

import { create } from "zustand";
import { AppNotification } from "@/models";
import * as notificationService from "@/services/notificationService";

// One shared copy of the signed-in person's notifications, so every bell on
// the page (navbar, dashboard sidebar) shows the same thing from one poll.
// Loaded by useNotificationPolling (mounted once in app/providers.tsx).
interface NotificationState {
  items: AppNotification[];
  unreadCount: number;
  loaded: boolean;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  loaded: false,

  load: async () => {
    try {
      const { items, unreadCount } = await notificationService.getMyNotifications();
      set({ items, unreadCount, loaded: true });
    } catch {
      // Keep what's shown; the next poll tries again.
    }
  },

  // Optimistic: the bell updates at once, and a failed call just leaves it
  // for the next poll to correct.
  markRead: async (id) => {
    const target = get().items.find((n) => n._id === id);
    if (!target || target.readAt) return;
    const now = new Date().toISOString();
    set((s) => ({
      items: s.items.map((n) => (n._id === id ? { ...n, readAt: now } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
    await notificationService.markNotificationRead(id).catch(() => undefined);
  },

  markAllRead: async () => {
    const now = new Date().toISOString();
    set((s) => ({ items: s.items.map((n) => (n.readAt ? n : { ...n, readAt: now })), unreadCount: 0 }));
    await notificationService.markAllNotificationsRead().catch(() => undefined);
  },

  clear: () => set({ items: [], unreadCount: 0, loaded: false }),
}));
