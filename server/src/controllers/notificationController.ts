import { validateControllerInput } from "../middleware/controllerInput";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Notification } from "../models/Notification";
import { PushSubscription } from "../models/PushSubscription";
import { getVapidPublicKey } from "../integrations/webPush";
import { parseInput } from "../utils/checkoutValidation";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "../utils/notificationValidation";

const LIST_LIMIT = 30;
export const MAX_PUSH_DEVICES = 10;

// The signed-in person's latest notifications plus their unread count —
// one call, so the bell can poll it cheaply.
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getMyNotifications", req);
  const [items, unreadCount] = await Promise.all([
    Notification.find({ user: req.userId }).sort({ createdAt: -1 }).limit(LIST_LIMIT).select("-user").lean(),
    Notification.countDocuments({ user: req.userId, readAt: { $exists: false } }),
  ]);
  res.json({ items, unreadCount });
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  validateControllerInput("markNotificationRead", req);
  // Scoped to the owner, so someone else's id is just "not found".
  const result = await Notification.updateOne(
    { _id: req.params.id, user: req.userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } }
  );
  if (!result.matchedCount && !(await Notification.exists({ _id: req.params.id, user: req.userId }))) {
    return res.status(404).json({ message: "Notification not found" });
  }
  res.json({ ok: true });
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  validateControllerInput("markAllNotificationsRead", req);
  await Notification.updateMany({ user: req.userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
  res.json({ ok: true });
};

// Public key the browser needs to subscribe; null while push isn't set up.
export const getPushConfig = async (req: AuthRequest, res: Response) => {
  validateControllerInput("getPushConfig", req);
  res.json({ publicKey: getVapidPublicKey() });
};

export const subscribePush = async (req: AuthRequest, res: Response) => {
  validateControllerInput("subscribePush", req);
  const { endpoint, keys } = parseInput(pushSubscriptionSchema, req.body);
  // Same browser re-subscribing (or now signed in as someone else) moves
  // the row to this account instead of duplicating it.
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { $set: { user: req.userId, endpoint, keys } },
    { upsert: true }
  );
  // Each notification goes to every device, so an account keeps its newest
  // few: a script can't pile up thousands for the server to send to.
  const extra = await PushSubscription.find({ user: req.userId }).sort({ createdAt: -1 }).skip(MAX_PUSH_DEVICES).select("_id").lean();
  if (extra.length) await PushSubscription.deleteMany({ _id: { $in: extra.map((s) => s._id) } });
  res.status(201).json({ ok: true });
};

export const unsubscribePush = async (req: AuthRequest, res: Response) => {
  validateControllerInput("unsubscribePush", req);
  const { endpoint } = parseInput(pushUnsubscribeSchema, req.body);
  await PushSubscription.deleteOne({ endpoint, user: req.userId });
  res.json({ ok: true });
};
