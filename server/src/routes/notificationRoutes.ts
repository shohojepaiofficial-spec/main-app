import { Router } from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPushConfig,
  subscribePush,
  unsubscribePush,
} from "../controllers/notificationController";
import { protect } from "../middleware/auth";

// Every route is the signed-in person's own notifications — customers and
// staff alike, so `protect` only (no permission check).
const router = Router();

router.get("/", protect, getMyNotifications);
router.patch("/read-all", protect, markAllNotificationsRead);
router.patch("/:id/read", protect, markNotificationRead);
router.get("/push/config", protect, getPushConfig);
router.post("/push/subscribe", protect, subscribePush);
router.post("/push/unsubscribe", protect, unsubscribePush);

export default router;
