import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";

const mocks = vi.hoisted(() => ({
  SitePopup: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
  audit: vi.fn(),
  store: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../models/SitePopup", () => ({ SitePopup: mocks.SitePopup }));
vi.mock("../utils/auditLog", () => ({ recordAuditEvent: mocks.audit }));
vi.mock("../utils/upload", () => ({ storeUploadedFile: mocks.store, deleteUploadedFile: mocks.remove }));
vi.mock("mongoose", async (original) => {
  const actual = await original<typeof import("mongoose")>();
  const session = { withTransaction: (run: () => Promise<void>) => run(), endSession: vi.fn() };
  return { ...actual, default: { ...actual.default, startSession: vi.fn(async () => session) } };
});

import { getSitePopup, updateSitePopup } from "./sitePopupController";

const ID = "507f1f77bcf86cd799439011";
const doc = (fields: Record<string, unknown>) => ({ id: ID, version: 1, ...fields, toObject: () => fields });
function call(body: Record<string, unknown> = {}, extra: Partial<AuthRequest> = {}) {
  const req = { body, params: {}, method: "PUT", userId: "admin", ...extra } as unknown as AuthRequest;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res: res as unknown as Response, status: res.status, json: res.json };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.SitePopup.findOneAndUpdate.mockImplementation(async (_q, update) => doc({ ...update.$set, version: 2 }));
});

describe("public popup", () => {
  it("returns null when switched off", async () => {
    mocks.SitePopup.findOne.mockResolvedValue(doc({ isActive: false, title: "Hi", message: "" }));
    const { req, res, json } = call();
    await getSitePopup(req, res);
    expect(json).toHaveBeenCalledWith(null);
  });

  it("returns the visible content when on", async () => {
    mocks.SitePopup.findOne.mockResolvedValue(doc({ isActive: true, title: "Sale", message: "20% off", image: "/uploads/p.webp", version: 3 }));
    const { req, res, json } = call();
    await getSitePopup(req, res);
    expect(json).toHaveBeenCalledWith({ title: "Sale", message: "20% off", image: "/uploads/p.webp", button: undefined, version: 3 });
  });
});

describe("updating the popup", () => {
  it("refuses unsafe button links", async () => {
    mocks.SitePopup.findOne.mockResolvedValue(null);
    const { req, res, status } = call({ isActive: "true", title: "Hi", buttonLabel: "Go", buttonHref: "javascript:alert(1)" });
    await updateSitePopup(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(mocks.SitePopup.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("refuses turning on an empty popup", async () => {
    mocks.SitePopup.findOne.mockResolvedValue(null);
    const { req, res, status } = call({ isActive: "true", title: "", message: "" });
    await updateSitePopup(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("bumps the version and records history when the message changes", async () => {
    mocks.SitePopup.findOne.mockResolvedValue(doc({ isActive: true, title: "Old", message: "" }));
    const { req, res, json } = call({ isActive: "true", title: "New", message: "", buttonLabel: "Shop", buttonHref: "/shop" });
    await updateSitePopup(req, res);
    const update = mocks.SitePopup.findOneAndUpdate.mock.calls[0][1];
    expect(update.$inc).toEqual({ version: 1 });
    expect(update.$set.button).toEqual({ label: "Shop", href: "/shop" });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ entityType: "popup", action: "updated" }), expect.anything());
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ title: "New", version: 2 }));
  });

  it("keeps the version when only switching off", async () => {
    mocks.SitePopup.findOne.mockResolvedValue(doc({ isActive: true, title: "Same", message: "" }));
    const { req, res } = call({ isActive: "false", title: "Same", message: "" });
    await updateSitePopup(req, res);
    expect(mocks.SitePopup.findOneAndUpdate.mock.calls[0][1].$inc).toBeUndefined();
  });

  it("deletes the old image only after a new one is saved", async () => {
    mocks.SitePopup.findOne.mockResolvedValue(doc({ isActive: true, title: "T", message: "", image: "/uploads/old.webp" }));
    mocks.store.mockResolvedValue("/uploads/new.webp");
    const { req, res } = call({ isActive: "true", title: "T", message: "" }, { file: {} as Express.Multer.File });
    await updateSitePopup(req, res);
    expect(mocks.remove).toHaveBeenCalledWith("/uploads/old.webp");
  });
});
