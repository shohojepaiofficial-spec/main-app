import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../models/Notification", () => ({ Notification: { insertMany: vi.fn().mockResolvedValue([]) } }));
vi.mock("../models/PushSubscription", () => ({ PushSubscription: { find: vi.fn(), deleteMany: vi.fn().mockResolvedValue({}) } }));
vi.mock("../models/User", () => ({ User: { find: vi.fn() } }));
vi.mock("../integrations/webPush", () => ({ isWebPushConfigured: vi.fn(), sendWebPush: vi.fn() }));
vi.mock("../models/Order", () => ({ Order: { findOneAndUpdate: vi.fn() } }));

import { Notification } from "../models/Notification";
import { PushSubscription } from "../models/PushSubscription";
import { User } from "../models/User";
import { isWebPushConfigured, sendWebPush } from "../integrations/webPush";
import { notifyUsers, notifyStaff } from "./notify";
import { orderStatusNotification, returnUpdateNotification, staffLowStockNotification } from "./notificationMessages";
import { itemsThatCrossedLowStock } from "./lowStockAlert";
import { isAllowedPushEndpoint } from "./notificationValidation";
import { validateControllerInput } from "../middleware/controllerInput";
import { Order } from "../models/Order";
import { flagPaymentReview } from "./paymentReview";
import type { Request } from "express";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const ORDER = "507f1f77bcf86cd799439011";

beforeEach(() => vi.clearAllMocks());

describe("notification text", () => {
  it("tells a COD customer what to have ready, and links the order", () => {
    const n = orderStatusNotification("shipped", { id: ORDER, paymentMethod: "cod", totalAmount: 1500 });
    expect(n.title).toBe("Order #439011 is on its way");
    expect(n.body).toContain("৳1,500");
    expect(n.link).toBe(`/orders/${ORDER}`);
  });

  it("explains an unpaid bKash cancellation and a paid one differently", () => {
    expect(orderStatusNotification("cancelled", { id: ORDER, paymentMethod: "bkash", totalAmount: 1, previousStatus: "pending" }).body).toBe("No payment was received.");
    expect(orderStatusNotification("cancelled", { id: ORDER, paymentMethod: "bkash", totalAmount: 1, paymentReceived: true }).body).toContain("refund");
  });

  it("says exchange for an exchange", () => {
    expect(returnUpdateNotification("approved", ORDER, "exchange").title).toBe("Your exchange was approved");
  });

  it("summarises many low-stock items", () => {
    const n = staffLowStockNotification(["A: 1 left", "B: 2 left", "C: 3 left", "D: 4 left"]);
    expect(n.title).toBe("4 items low on stock");
    expect(n.body).toBe("A: 1 left, B: 2 left, C: 3 left and 1 more");
  });
});

describe("low stock crossing", () => {
  const products = [
    { _id: "p1", name: "Mug", stock: 4 },
    { _id: "p2", name: "Hoodie", stock: 20, variants: [{ _id: "v1", selections: [{ name: "Size", value: "L" }], stock: 5 }] },
    { _id: "p3", name: "Cap", stock: 2 },
  ];

  it("alerts only items this sale pushed to the line", () => {
    const rows = itemsThatCrossedLowStock(
      [
        { product: "p1", quantity: 2 }, // 6 -> 4: crossed
        { product: "p2", variant: "v1", quantity: 1 }, // 6 -> 5: crossed
        { product: "p3", quantity: 1 }, // 3 -> 2: already low
      ],
      products
    );
    expect(rows).toEqual(["Mug: 4 left", "Hoodie · L: 5 left"]);
  });

  it("skips pre-order lines", () => {
    expect(itemsThatCrossedLowStock([{ product: "p1", quantity: 2, isPreorder: true }], products)).toEqual([]);
  });
});

describe("delivery", () => {
  it("stores one bell notification per distinct person and skips push when not configured", async () => {
    vi.mocked(isWebPushConfigured).mockReturnValue(false);
    notifyUsers([ORDER, ORDER, "507f1f77bcf86cd799439012"], { type: "review_reply", title: "t", body: "b" });
    await flush();
    expect(vi.mocked(Notification.insertMany).mock.calls[0][0]).toHaveLength(2);
    expect(PushSubscription.find).not.toHaveBeenCalled();
  });

  it("pushes to each device and forgets ones the browser dropped", async () => {
    vi.mocked(isWebPushConfigured).mockReturnValue(true);
    vi.mocked(PushSubscription.find).mockReturnValue({ select: () => Promise.resolve([
      { endpoint: "https://fcm.googleapis.com/a", keys: { p256dh: "k", auth: "a" } },
      { endpoint: "https://fcm.googleapis.com/b", keys: { p256dh: "k", auth: "a" } },
    ]) } as never);
    vi.mocked(sendWebPush).mockResolvedValueOnce("sent").mockResolvedValueOnce("gone");
    notifyUsers([ORDER], { type: "review_reply", title: "t", body: "b", link: "/x" });
    await flush(); await flush();
    expect(sendWebPush).toHaveBeenCalledTimes(2);
    expect(PushSubscription.deleteMany).toHaveBeenCalledWith({ endpoint: { $in: ["https://fcm.googleapis.com/b"] } });
  });

  it("sends staff alerts to the admin and coadmins holding the permission", async () => {
    vi.mocked(isWebPushConfigured).mockReturnValue(false);
    vi.mocked(User.find).mockReturnValue({ select: () => Promise.resolve([{ _id: ORDER }]) } as never);
    notifyStaff("orders:manage", { type: "staff_new_order", title: "t", body: "b" });
    await flush(); await flush();
    expect(User.find).toHaveBeenCalledWith({ $or: [{ role: "admin" }, { role: "coadmin", permissions: "orders:manage" }] });
    expect(Notification.insertMany).toHaveBeenCalled();
  });
});

describe("push subscription input", () => {
  it("accepts only the browsers' own push services", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=x")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedPushEndpoint("https://evil.com/fcm.googleapis.com")).toBe(false);
  });

  it("rejects extra fields and operator keys", () => {
    const req = (body: unknown) => ({ params: {}, body, method: "POST" }) as unknown as Request;
    expect(() => validateControllerInput("subscribePush", req({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a", auth: "b" } }))).not.toThrow();
    expect(() => validateControllerInput("subscribePush", req({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a", auth: "b" }, user: "x" }))).toThrow();
    expect(() => validateControllerInput("unsubscribePush", req({ endpoint: { $ne: "" } }))).toThrow();
  });
});

describe("payment review alert", () => {
  it("alerts staff the first time an order is flagged, not on every re-check", async () => {
    vi.mocked(isWebPushConfigured).mockReturnValue(false);
    vi.mocked(User.find).mockReturnValue({ select: () => Promise.resolve([{ _id: ORDER }]) } as never);
    vi.mocked(Order.findOneAndUpdate).mockResolvedValueOnce({ paymentReviewRequired: false } as never).mockResolvedValueOnce({ paymentReviewRequired: true } as never);
    await flagPaymentReview(ORDER, "reason");
    await flagPaymentReview(ORDER, "reason");
    await flush(); await flush();
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith({ _id: ORDER }, { $set: { paymentReviewRequired: true } }, expect.anything());
    expect(Notification.insertMany).toHaveBeenCalledTimes(1);
  });
});
