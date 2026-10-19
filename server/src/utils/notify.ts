import { Types } from "mongoose";
import { Notification, NotificationType } from "../models/Notification";
import { PushSubscription } from "../models/PushSubscription";
import { User } from "../models/User";
import { Permission } from "./permissions";
import { isWebPushConfigured, sendWebPush } from "../integrations/webPush";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

// The one way to notify people: stores a bell notification per recipient,
// then sends browser push to each of their subscribed devices. Fire-and-
// forget like the emails — a failure here must never fail or undo the
// action that triggered it, so callers never await it.
export function notifyUsers(userIds: (string | Types.ObjectId)[], input: NotificationInput) {
  Promise.resolve()
    .then(() => deliver(userIds, input))
    .catch((err) => console.error("Notification failed:", (err as Error).message));
}

export function notifyUser(userId: string | Types.ObjectId | null | undefined, input: NotificationInput) {
  if (!userId) return;
  notifyUsers([userId], input);
}

// Staff alert: the admin plus every coadmin holding `permission`.
export function notifyStaff(permission: Permission, input: NotificationInput) {
  Promise.resolve()
    .then(() => staffRecipients(permission))
    .then((ids) => deliver(ids, input))
    .catch((err) => console.error("Staff notification failed:", (err as Error).message));
}

export async function staffRecipients(permission: Permission): Promise<Types.ObjectId[]> {
  const staff = await User.find({
    $or: [{ role: "admin" }, { role: "coadmin", permissions: permission }],
  }).select("_id");
  return staff.map((s) => s._id as Types.ObjectId);
}

async function deliver(userIds: (string | Types.ObjectId)[], input: NotificationInput) {
  const unique = [...new Set(userIds.map(String))];
  if (unique.length === 0) return;
  await Notification.insertMany(unique.map((user) => ({ user, ...input })));
  if (!isWebPushConfigured()) return;

  const subscriptions = await PushSubscription.find({ user: { $in: unique } }).select("endpoint keys");
  const gone: string[] = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        { title: input.title, body: input.body, link: input.link }
      );
      if (result === "gone") gone.push(sub.endpoint);
    })
  );
  if (gone.length) await PushSubscription.deleteMany({ endpoint: { $in: gone } });
}
