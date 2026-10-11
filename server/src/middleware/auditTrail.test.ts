import express from "express";
import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { loadAuditSnapshot, recordAuditEvent } = vi.hoisted(() => ({
  loadAuditSnapshot: vi.fn(),
  recordAuditEvent: vi.fn(),
}));
vi.mock("../utils/auditTargets", () => ({ loadAuditSnapshot }));
vi.mock("../utils/auditLog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/auditLog")>()),
  recordAuditEvent,
}));

import { auditTrail } from "./auditTrail";
import type { AuthRequest } from "./auth";

const STAFF_ID = "507f1f77bcf86cd799439011";
const ORDER_ID = "507f1f77bcf86cd799439022";

const app = express();
app.use(express.json());
app.use((req: AuthRequest, _res, next) => {
  req.userId = STAFF_ID;
  req.userRole = req.header("x-role") ?? "admin";
  next();
});
app.patch("/orders/:id/status", auditTrail({ entityType: "order", action: "updated", target: { from: "param" } }), (req, res) => {
  if (req.body.fail) return res.status(400).json({ message: "nope" });
  res.json({ ok: true });
});
app.post("/promos", auditTrail({ entityType: "promo", action: "created", target: { from: "created" } }), (_req, res) => {
  res.status(201).json({ id: "507f1f77bcf86cd799439033" });
});
app.patch("/password", auditTrail({
  entityType: "account", action: "updated", target: { from: "self" },
  changes: () => [{ field: "password", after: "Changed" }],
}), (_req, res) => { res.json({ ok: true }); });

let server: Server;
let baseUrl: string;
beforeAll(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
beforeEach(() => {
  loadAuditSnapshot.mockReset();
  recordAuditEvent.mockReset().mockResolvedValue(undefined);
});

const call = (path: string, method: string, body: unknown, role = "admin") =>
  fetch(baseUrl + path, { method, headers: { "content-type": "application/json", "x-role": role }, body: JSON.stringify(body) });
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("auditTrail", () => {
  it("records the before/after difference of a staff change", async () => {
    loadAuditSnapshot
      .mockResolvedValueOnce({ name: "Order #439022", data: { status: "pending" } })
      .mockResolvedValueOnce({ name: "Order #439022", data: { status: "shipped" } });
    await call(`/orders/${ORDER_ID}/status`, "PATCH", { status: "shipped" }, "coadmin");
    await settle();
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorId: STAFF_ID, entityType: "order", entityId: ORDER_ID, entityName: "Order #439022",
      changes: [{ field: "status", before: "pending", after: "shipped" }],
    }));
  });

  it("ignores customers and failed requests", async () => {
    await call(`/orders/${ORDER_ID}/status`, "PATCH", { status: "shipped" }, "user");
    loadAuditSnapshot.mockResolvedValue({ name: "Order", data: { status: "pending" } });
    await call(`/orders/${ORDER_ID}/status`, "PATCH", { fail: true });
    await settle();
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("finds a created item from the response", async () => {
    loadAuditSnapshot.mockResolvedValue({ name: "SAVE10", data: { code: "SAVE10", value: 10 } });
    await call("/promos", "POST", {});
    await settle();
    expect(loadAuditSnapshot).toHaveBeenCalledWith("promo", "507f1f77bcf86cd799439033");
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "created", entityName: "SAVE10" }));
  });

  it("uses explicit changes for account security events without storing secrets", async () => {
    loadAuditSnapshot.mockResolvedValue({ name: "Store Owner", data: { name: "Store Owner" } });
    await call("/password", "PATCH", { currentPassword: "old-secret", newPassword: "new-secret" });
    await settle();
    const event = recordAuditEvent.mock.calls[0][0];
    expect(event.changes).toEqual([{ field: "password", after: "Changed" }]);
    expect(JSON.stringify(event)).not.toContain("secret");
  });

  it("does not fail the request when recording fails", async () => {
    loadAuditSnapshot.mockResolvedValue({ name: "Order", data: { status: "pending" } });
    recordAuditEvent.mockRejectedValue(new Error("db down"));
    const response = await call(`/orders/${ORDER_ID}/status`, "PATCH", { status: "paid" });
    expect(response.status).toBe(200);
  });
});
