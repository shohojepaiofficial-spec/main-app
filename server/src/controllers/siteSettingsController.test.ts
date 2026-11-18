import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";

const mocks = vi.hoisted(() => ({
  SiteSettings: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
  audit: vi.fn(),
}));
vi.mock("../models/SiteSettings", () => ({ SiteSettings: mocks.SiteSettings }));
vi.mock("../utils/auditLog", () => ({ recordAuditEvent: mocks.audit }));

import { getPublicSiteSettings, getSiteSettings, updateSiteSettings } from "./siteSettingsController";

const doc = (fields: Record<string, unknown>) => ({ id: "settings1", ...fields, toObject: () => fields });
function call(body: Record<string, unknown> = {}) {
  const req = { body, params: {}, method: "PUT", userId: "admin" } as unknown as AuthRequest;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res: res as unknown as Response, status: res.status, json: res.json };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.SiteSettings.findOneAndUpdate.mockImplementation(async (_q, update) => doc(update.$set ?? {}));
});

describe("public settings", () => {
  it("returns only the social links, never email routing", async () => {
    mocks.SiteSettings.findOne.mockReturnValue({
      lean: () => Promise.resolve({ social: { facebookUrl: "https://facebook.com/x" }, emailRouting: { contact: "secret@x.com" } }),
    });
    const { req, res, json } = call();
    await getPublicSiteSettings(req as unknown as never, res);
    expect(json).toHaveBeenCalledWith({
      social: { facebookUrl: "https://facebook.com/x", instagramUrl: "", whatsappNumber: "" },
      contact: { phone: "", email: "", address: "" },
    });
  });
});

describe("admin settings", () => {
  it("returns empty strings when nothing is configured yet", async () => {
    mocks.SiteSettings.findOne.mockResolvedValue(null);
    const { req, res, json } = call();
    await getSiteSettings(req, res);
    expect(json).toHaveBeenCalledWith({
      social: { facebookUrl: "", instagramUrl: "", whatsappNumber: "" },
      contact: { phone: "", email: "", address: "" },
      emailRouting: { contact: "", transactional: "", transactionalName: "", marketing: "", marketingName: "" },
    });
  });
});

describe("updating settings", () => {
  it("refuses a non-https Facebook link", async () => {
    mocks.SiteSettings.findOne.mockResolvedValue(null);
    const { req, res, status } = call({ social: { facebookUrl: "javascript:alert(1)" } });
    await updateSiteSettings(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(mocks.SiteSettings.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("refuses an invalid WhatsApp number", async () => {
    mocks.SiteSettings.findOne.mockResolvedValue(null);
    const { req, res, status } = call({ social: { whatsappNumber: "not-a-number" } });
    await updateSiteSettings(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("refuses an invalid email address", async () => {
    mocks.SiteSettings.findOne.mockResolvedValue(null);
    const { req, res, status } = call({ emailRouting: { contact: "not-an-email" } });
    await updateSiteSettings(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("refuses an invalid contact email address", async () => {
    mocks.SiteSettings.findOne.mockResolvedValue(null);
    const { req, res, status } = call({ contact: { email: "not-an-email" } });
    await updateSiteSettings(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("saves contact phone/email/address and records the change", async () => {
    mocks.SiteSettings.findOne.mockResolvedValue(doc({ social: {}, emailRouting: {}, contact: {} }));
    const { req, res, json } = call({ contact: { phone: "+880 1700-502013", email: "Hello@Example.com", address: "Main road, Sylhet" } });
    await updateSiteSettings(req, res);
    const update = mocks.SiteSettings.findOneAndUpdate.mock.calls[0][1];
    expect(update.$set["contact.phone"]).toBe("+880 1700-502013");
    expect(update.$set["contact.email"]).toBe("hello@example.com");
    expect(update.$set["contact.address"]).toBe("Main road, Sylhet");
    expect(json).toHaveBeenCalled();
  });

  it("normalizes a valid WhatsApp number and records the change", async () => {
    mocks.SiteSettings.findOne.mockResolvedValue(doc({ social: {}, emailRouting: {} }));
    const { req, res, json } = call({ social: { whatsappNumber: "01712345678" }, emailRouting: { marketing: "Promo@Example.com" } });
    await updateSiteSettings(req, res);
    const update = mocks.SiteSettings.findOneAndUpdate.mock.calls[0][1];
    expect(update.$set["social.whatsappNumber"]).toBe("8801712345678");
    expect(update.$set["emailRouting.marketing"]).toBe("promo@example.com");
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ entityType: "settings", action: "updated" }));
    expect(json).toHaveBeenCalled();
  });
});
