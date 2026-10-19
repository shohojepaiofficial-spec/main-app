import { api } from "@/lib/api";
import { BrowserPushSubscription, NotificationList } from "@/models";

export const getMyNotifications = async (): Promise<NotificationList> => {
  const { data } = await api.get<NotificationList>("/notifications");
  return data;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch("/notifications/read-all");
};

// The server's VAPID public key, or null while browser push isn't set up.
export const getPushPublicKey = async (): Promise<string | null> => {
  const { data } = await api.get<{ publicKey: string | null }>("/notifications/push/config");
  return data.publicKey;
};

export const subscribePush = async (subscription: BrowserPushSubscription): Promise<void> => {
  await api.post("/notifications/push/subscribe", subscription);
};

export const unsubscribePush = async (endpoint: string): Promise<void> => {
  await api.post("/notifications/push/unsubscribe", { endpoint });
};
